import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requirePsychologist } from "@/lib/security/api-guards";
import { sendTelegramMessage } from "@/lib/telegram";

type ParamsPromise = {
  params: Promise<{
    id: string;
  }>;
};

// Изменение статуса записи (например, отмена)
export async function PATCH(request: Request, { params }: ParamsPromise) {
  try {
    const { id } = await params;
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;

    const body = await request.json().catch(() => null);
    const status = body?.status as "PENDING_CONFIRMATION" | "SCHEDULED" | "COMPLETED" | "CANCELED" | undefined;

    if (!status) {
      return NextResponse.json(
        { message: "Не указан статус" },
        { status: 400 }
      );
    }

    const profile = await prisma.psychologistProfile.findUnique({
      where: { id: ctx.psychologistId }
    });

    const psychologistName = profile
      ? `${profile.lastName} ${profile.firstName}`.trim() || "Психолог"
      : "Психолог";

    const appt = await prisma.appointment.findUnique({
      where: { id },
      include: { slot: true, client: { select: { userId: true, psychologistId: true } } }
    });

    if (!appt || appt.psychologistId !== ctx.psychologistId) {
      return NextResponse.json(
        { message: "Запись не найдена или вам недоступна" },
        { status: 404 }
      );
    }

    const wasPendingBefore = appt.status === "PENDING_CONFIRMATION";
    const alreadyInListBefore = appt.client?.psychologistId === ctx.psychologistId;
    const clientAddedToList =
      status === "SCHEDULED" && wasPendingBefore && !alreadyInListBefore;

    const result = await prisma.$transaction(async tx => {
    const slotIdToFree = appt.slotId;
    const wasPending = appt.status === "PENDING_CONFIRMATION";

    const updated = await tx.appointment.update({
      where: { id },
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

    // При подтверждении записи (PENDING → SCHEDULED) добавляем клиента в список только если его там ещё нет, уведомление о добавлении — только в этом случае
    if (status === "SCHEDULED" && wasPending) {
      const alreadyInList = appt.client?.psychologistId === ctx.psychologistId;
      if (!alreadyInList) {
        await tx.clientProfile.update({
          where: { id: appt.clientId },
          data: { psychologistId: ctx.psychologistId }
        });
      }
      const clientUserId = appt.client?.userId;
      if (clientUserId) {
        const dateStr = appt.start.toLocaleString("ru-RU", {
          dateStyle: "short",
          timeStyle: "short"
        });
        const bodyText = `Психолог ${psychologistName} подтвердил(а) вашу запись на приём ${dateStr}.`;
        await tx.notification.create({
          data: {
            userId: clientUserId,
            title: "Запись подтверждена",
            body: bodyText
          }
        });
      }
    }

    // При отмене записи психологом — уведомление клиенту
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

    return updated;
  });

    // Уведомление клиенту в Telegram при подтверждении или отмене
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

    return NextResponse.json({
      ...result,
      clientAddedToList: status === "SCHEDULED" ? clientAddedToList : undefined
    });
  } catch (err) {
    console.error("[PATCH /api/appointments/[id]]", err);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

