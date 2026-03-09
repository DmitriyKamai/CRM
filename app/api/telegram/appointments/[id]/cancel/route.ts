import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { sendTelegramMessage } from "@/lib/telegram";

const BOT_SECRET_HEADER = "x-bot-secret";

/**
 * Отмена записи из бота (клиент или психолог отменяет свою запись).
 * POST, тело: { chatId }. Заголовок X-Bot-Secret.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const secret = request.headers.get(BOT_SECRET_HEADER);
    const expected = process.env.TELEGRAM_BOT_SECRET;
    if (!expected || secret !== expected) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id: appointmentId } = await params;
    const body = await request.json().catch(() => null);
    const chatId =
      typeof body?.chatId === "number"
        ? body.chatId
        : typeof body?.chatId === "string"
          ? Number(body.chatId)
          : null;

    if (chatId == null || Number.isNaN(chatId)) {
      return NextResponse.json(
        { message: "Нужен chatId" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { telegramChatId: String(chatId) },
      select: { id: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ message: "Пользователь не найден" }, { status: 404 });
    }

    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        slot: true,
        client: { select: { userId: true, psychologistId: true } },
        psychologist: { select: { id: true, userId: true, firstName: true, lastName: true } }
      }
    });

    if (!appt) {
      return NextResponse.json({ message: "Запись не найдена" }, { status: 404 });
    }

    if (appt.status !== "SCHEDULED" && appt.status !== "PENDING_CONFIRMATION") {
      return NextResponse.json(
        { message: "Эту запись нельзя отменить" },
        { status: 400 }
      );
    }

    let isClient = false;
    let isPsychologist = false;

    if (user.role === "CLIENT") {
      const clientProfile = await prisma.clientProfile.findFirst({
        where: { userId: user.id, id: appt.clientId },
        select: { id: true }
      });
      isClient = !!clientProfile;
    }

    if (user.role === "PSYCHOLOGIST" && appt.psychologistId === appt.psychologist?.id) {
      const profile = await prisma.psychologistProfile.findUnique({
        where: { userId: user.id },
        select: { id: true }
      });
      isPsychologist = profile?.id === appt.psychologistId;
    }

    if (!isClient && !isPsychologist) {
      return NextResponse.json(
        { message: "Вы не можете отменить эту запись" },
        { status: 403 }
      );
    }

    const psychologistName = appt.psychologist
      ? `${appt.psychologist.lastName} ${appt.psychologist.firstName}`.trim() || "Психолог"
      : "Психолог";
    const dateStr = appt.start.toLocaleString("ru-RU", {
      dateStyle: "short",
      timeStyle: "short"
    });

    await prisma.$transaction(async (tx) => {
      const slotIdToFree = appt.slotId;

      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: "CANCELED", slotId: null }
      });

      if (slotIdToFree) {
        await tx.scheduleSlot.update({
          where: { id: slotIdToFree },
          data: { status: "FREE" }
        });
      }

      // Уведомление второй стороне в приложении
      if (isPsychologist) {
        const clientUserId = appt.client?.userId;
        if (clientUserId) {
          await tx.notification.create({
            data: {
              userId: clientUserId,
              title: "Запись отменена",
              body: `Психолог ${psychologistName} отменил(а) вашу запись на приём ${dateStr}.`
            }
          });
        }
      } else {
        const psychUserId = appt.psychologist?.userId;
        if (psychUserId) {
          const clientProfile = await tx.clientProfile.findUnique({
            where: { id: appt.clientId },
            select: { firstName: true, lastName: true }
          });
          const clientName = clientProfile
            ? `${(clientProfile.lastName ?? "").trim()} ${(clientProfile.firstName ?? "").trim()}`.trim() || "Клиент"
            : "Клиент";
          await tx.notification.create({
            data: {
              userId: psychUserId,
              title: "Запись отменена",
              body: `Клиент ${clientName} отменил(а) запись на приём ${dateStr}.`
            }
          });
        }
      }
    });

    // Уведомление второй стороне в Telegram
    if (isPsychologist) {
      const clientUserId = appt.client?.userId;
      if (clientUserId) {
        const clientUser = await prisma.user.findUnique({
          where: { id: clientUserId },
          select: { telegramChatId: true }
        });
        if (clientUser?.telegramChatId) {
          sendTelegramMessage(
            clientUser.telegramChatId,
            `Запись отменена.\n\nПсихолог ${psychologistName} отменил(а) вашу запись на приём ${dateStr}.`
          ).catch(console.error);
        }
      }
    } else {
      const psychUserId = appt.psychologist?.userId;
      if (psychUserId) {
        const psychUser = await prisma.user.findUnique({
          where: { id: psychUserId },
          select: { telegramChatId: true }
        });
        if (psychUser?.telegramChatId) {
          const clientProfile = await prisma.clientProfile.findUnique({
            where: { id: appt.clientId },
            select: { firstName: true, lastName: true }
          });
          const clientName = clientProfile
            ? `${(clientProfile.lastName ?? "").trim()} ${(clientProfile.firstName ?? "").trim()}`.trim() || "Клиент"
            : "Клиент";
          sendTelegramMessage(
            psychUser.telegramChatId,
            `Запись отменена.\n\nКлиент ${clientName} отменил(а) запись на приём ${dateStr}.`
          ).catch(console.error);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/telegram/appointments/[id]/cancel]", err);
    return NextResponse.json(
      { message: "Ошибка сервера" },
      { status: 500 }
    );
  }
}
