import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { sendTelegramMessage } from "@/lib/telegram";

const BOT_SECRET_HEADER = "x-bot-secret";

/**
 * Вызывается ботом при нажатии «Подтвердить» / «Отменить» в Telegram.
 * Тело: { action: "confirm" | "cancel", chatId: number }.
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
    const action = body?.action === "confirm" ? "confirm" : body?.action === "cancel" ? "cancel" : null;
    const chatId =
      typeof body?.chatId === "number"
        ? body.chatId
        : typeof body?.chatId === "string"
          ? Number(body.chatId)
          : null;

    if (!action || chatId == null || Number.isNaN(chatId)) {
      return NextResponse.json(
        { message: "Нужны action (confirm|cancel) и chatId" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { telegramChatId: String(chatId) },
      select: { id: true }
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

    const profile = await prisma.psychologistProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, firstName: true, lastName: true }
    });

    const isPsychologistByProfile = Boolean(profile && appt.psychologistId === profile.id);
    const isPsychologistByUserId = appt.psychologist?.userId === user.id;
    const isPsychologist = isPsychologistByProfile || isPsychologistByUserId;
    const clientProfile = await prisma.clientProfile.findFirst({
      where: { userId: user.id, id: appt.clientId },
      select: { id: true }
    });
    const isClientByProfile = !!clientProfile;
    const isClientByUserId = appt.client?.userId === user.id;
    const isClient = isClientByProfile || isClientByUserId;

    if (!isPsychologist && !isClient) {
      return NextResponse.json({ message: "Запись вам недоступна" }, { status: 403 });
    }

    const status = action === "confirm" ? "SCHEDULED" : "CANCELED";

    if (action === "confirm" && appt.status !== "PENDING_CONFIRMATION") {
      return NextResponse.json(
        { message: "Запись уже подтверждена или отменена" },
        { status: 409 }
      );
    }
    if (action === "cancel" && appt.status !== "PENDING_CONFIRMATION" && appt.status !== "SCHEDULED") {
      return NextResponse.json(
        { message: "Эту запись нельзя отменить" },
        { status: 400 }
      );
    }

    const psychologistName = appt.psychologist
      ? `${appt.psychologist.lastName} ${appt.psychologist.firstName}`.trim() || "Психолог"
      : "Психолог";

    if (isClient && action === "confirm") {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: "SCHEDULED" }
      });
      return NextResponse.json({ ok: true, status: "SCHEDULED" });
    }

    if (isClient && action === "cancel") {
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
        const psychUserId = appt.psychologist?.userId;
        if (psychUserId) {
          const clientProfileForNotif = await tx.clientProfile.findUnique({
            where: { id: appt.clientId },
            select: { firstName: true, lastName: true }
          });
          const clientName = clientProfileForNotif
            ? `${(clientProfileForNotif.lastName ?? "").trim()} ${(clientProfileForNotif.firstName ?? "").trim()}`.trim() || "Клиент"
            : "Клиент";
          const dateStr = appt.start.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
          await tx.notification.create({
            data: {
              userId: psychUserId,
              title: "Запись отменена",
              body: `Клиент ${clientName} отменил(а) запись на приём ${dateStr}.`
            }
          });
        }
      });
      const psychUserId = appt.psychologist?.userId;
      if (psychUserId) {
        const psychUser = await prisma.user.findUnique({
          where: { id: psychUserId },
          select: { telegramChatId: true }
        });
        if (psychUser?.telegramChatId) {
          const clientProfileForNotif = await prisma.clientProfile.findUnique({
            where: { id: appt.clientId },
            select: { firstName: true, lastName: true }
          });
          const clientName = clientProfileForNotif
            ? `${(clientProfileForNotif.lastName ?? "").trim()} ${(clientProfileForNotif.firstName ?? "").trim()}`.trim() || "Клиент"
            : "Клиент";
          const dateStr = appt.start.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
          sendTelegramMessage(
            psychUser.telegramChatId,
            `Запись отменена.\n\nКлиент ${clientName} отменил(а) запись на приём ${dateStr}.`
          ).catch(console.error);
        }
      }
      return NextResponse.json({ ok: true, status: "CANCELED" });
    }

    if (!isPsychologist) {
      if (appt.client?.userId === user.id && action === "cancel") {
        await prisma.$transaction(async (tx) => {
          const slotIdToFree = appt.slotId;
          await tx.appointment.update({
            where: { id: appointmentId },
            data: { status: "CANCELED", slotId: null }
          });
          if (slotIdToFree) {
            await tx.scheduleSlot.update({ where: { id: slotIdToFree }, data: { status: "FREE" } });
          }
          const psychUserId = appt.psychologist?.userId;
          if (psychUserId) {
            const cp = await tx.clientProfile.findUnique({
              where: { id: appt.clientId },
              select: { firstName: true, lastName: true }
            });
            const clientName = cp ? `${(cp.lastName ?? "").trim()} ${(cp.firstName ?? "").trim()}`.trim() || "Клиент" : "Клиент";
            const dateStr = appt.start.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
            await tx.notification.create({
              data: { userId: psychUserId, title: "Запись отменена", body: `Клиент ${clientName} отменил(а) запись на приём ${dateStr}.` }
            });
          }
        });
        const psychUserId = appt.psychologist?.userId;
        if (psychUserId) {
          const psychUser = await prisma.user.findUnique({ where: { id: psychUserId }, select: { telegramChatId: true } });
          if (psychUser?.telegramChatId) {
            const cp = await prisma.clientProfile.findUnique({ where: { id: appt.clientId }, select: { firstName: true, lastName: true } });
            const clientName = cp ? `${(cp.lastName ?? "").trim()} ${(cp.firstName ?? "").trim()}`.trim() || "Клиент" : "Клиент";
            const dateStr = appt.start.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
            sendTelegramMessage(psychUser.telegramChatId, `Запись отменена.\n\nКлиент ${clientName} отменил(а) запись на приём ${dateStr}.`).catch(console.error);
          }
        }
        return NextResponse.json({ ok: true, status: "CANCELED" });
      }
      if (appt.client?.userId === user.id && action === "confirm" && appt.status === "PENDING_CONFIRMATION") {
        await prisma.appointment.update({ where: { id: appointmentId }, data: { status: "SCHEDULED" } });
        return NextResponse.json({ ok: true, status: "SCHEDULED" });
      }
      return NextResponse.json(
        { message: "Запись уже обработана" },
        { status: 409 }
      );
    }

    await prisma.$transaction(async tx => {
      const slotIdToFree = appt.slotId;
      const wasPending = true;

      await tx.appointment.update({
        where: { id: appointmentId },
        data:
          status === "CANCELED"
            ? { status: "CANCELED", slotId: null }
            : { status }
      });

      if (status === "CANCELED" && slotIdToFree) {
        await tx.scheduleSlot.update({
          where: { id: slotIdToFree },
          data: { status: "FREE" }
        });
      }

      if (status === "SCHEDULED" && wasPending) {
        const psychProfileId = profile?.id ?? appt.psychologistId;
        const alreadyInList = appt.client?.psychologistId === psychProfileId;
        if (!alreadyInList) {
          await tx.clientProfile.update({
            where: { id: appt.clientId },
            data: { psychologistId: psychProfileId }
          });
        }
        const clientUserId = appt.client?.userId;
        if (clientUserId) {
          const dateStr = appt.start.toLocaleString("ru-RU", {
            dateStyle: "short",
            timeStyle: "short"
          });
          await tx.notification.create({
            data: {
              userId: clientUserId,
              title: "Запись подтверждена",
              body: `Психолог ${psychologistName} подтвердил(а) вашу запись на приём ${dateStr}.`
            }
          });
        }
      }

      if (status === "CANCELED") {
        const clientUserId = appt.client?.userId;
        if (clientUserId) {
          const dateStr = appt.start.toLocaleString("ru-RU", {
            dateStyle: "short",
            timeStyle: "short"
          });
          await tx.notification.create({
            data: {
              userId: clientUserId,
              title: "Запись отменена",
              body: `Психолог ${psychologistName} отменил(а) вашу запись на приём ${dateStr}.`
            }
          });
        }
      }
    });

    // Уведомление клиенту в Telegram
    const clientUserId = appt.client?.userId;
    if (clientUserId && (status === "SCHEDULED" || status === "CANCELED")) {
      const clientUser = await prisma.user.findUnique({
        where: { id: clientUserId },
        select: { telegramChatId: true }
      });
      if (clientUser?.telegramChatId) {
        const dateStr = appt.start.toLocaleString("ru-RU", {
          dateStyle: "short",
          timeStyle: "short"
        });
        const text =
          status === "SCHEDULED"
            ? `Запись подтверждена.\n\nПсихолог ${psychologistName} подтвердил(а) вашу запись на приём ${dateStr}.`
            : `Запись отменена.\n\nПсихолог ${psychologistName} отменил(а) вашу запись на приём ${dateStr}.`;
        sendTelegramMessage(clientUser.telegramChatId, text).catch(console.error);
      }
    }

    return NextResponse.json({ ok: true, status });
  } catch (err) {
    console.error("[POST /api/telegram/appointments/[id]/action]", err);
    return NextResponse.json(
      { message: "Ошибка сервера" },
      { status: 500 }
    );
  }
}
