import { NextResponse } from "next/server";
import type { AppointmentStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { assertModuleEnabled } from "@/lib/platform-modules";
import { getClientIp, requirePsychologist } from "@/lib/security/api-guards";
import { safeLogAudit } from "@/lib/audit-log";
import { ClientHistoryType, safeLogClientHistory } from "@/lib/client-history";
import { sendTelegramMessage } from "@/lib/telegram";

type ParamsPromise = {
  params: Promise<{
    id: string;
  }>;
};

// Допустимые переходы статусов для психолога
const ALLOWED_TRANSITIONS: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
  PENDING_CONFIRMATION: ["SCHEDULED", "CANCELED"],
  SCHEDULED: ["CANCELED", "COMPLETED", "NO_SHOW"],
  NO_SHOW: ["COMPLETED"],
};

// Эти статусы можно выставить только для прошедших записей (end < now)
const PAST_ONLY_STATUSES: AppointmentStatus[] = ["COMPLETED", "NO_SHOW"];

export async function PATCH(request: Request, { params }: ParamsPromise) {
  try {
    const { id } = await params;
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;
    const mod = await assertModuleEnabled("scheduling");
    if (mod) return mod;

    const body = await request.json().catch(() => null);
    const rawStatus = body?.status as string | undefined;

    const VALID_STATUSES: AppointmentStatus[] = [
      "PENDING_CONFIRMATION", "SCHEDULED", "COMPLETED", "CANCELED", "NO_SHOW"
    ];

    if (!rawStatus || !VALID_STATUSES.includes(rawStatus as AppointmentStatus)) {
      return NextResponse.json(
        { message: "Не указан или неверный статус" },
        { status: 400 }
      );
    }

    const status = rawStatus as AppointmentStatus;

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

    // Валидация перехода по матрице
    const allowedTargets = ALLOWED_TRANSITIONS[appt.status as AppointmentStatus] ?? [];
    if (!allowedTargets.includes(status)) {
      return NextResponse.json(
        { message: `Нельзя перевести запись из статуса «${appt.status}» в «${status}»` },
        { status: 400 }
      );
    }

    // COMPLETED и NO_SHOW — только для прошедших записей
    if (PAST_ONLY_STATUSES.includes(status) && appt.end > new Date()) {
      return NextResponse.json(
        { message: "Отметить завершение можно только для прошедших записей" },
        { status: 400 }
      );
    }

    const wasPendingBefore = appt.status === "PENDING_CONFIRMATION";
    const alreadyInListBefore = appt.client?.psychologistId === ctx.psychologistId;
    const clientAddedToList =
      status === "SCHEDULED" && wasPendingBefore && !alreadyInListBefore;

    const result = await prisma.$transaction(async tx => {
      const slotIdToFree = appt.slotId;
      const wasPending = appt.status === "PENDING_CONFIRMATION";

      // При отмене — слот освобождаем если привязан
      const shouldFreeSlot = status === "CANCELED";

      const updated = await tx.appointment.update({
        where: { id },
        data: shouldFreeSlot
          ? { status: "CANCELED", slotId: null }
          : { status }
      });

      if (shouldFreeSlot && slotIdToFree) {
        await tx.scheduleSlot.update({
          where: { id: slotIdToFree },
          data: { status: "FREE" }
        });
      }

      // PENDING_CONFIRMATION → SCHEDULED: добавить клиента в список и уведомить
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
          await tx.notification.create({
            data: {
              userId: clientUserId,
              title: "Запись подтверждена",
              body: `Психолог ${psychologistName} подтвердил(а) вашу запись на приём ${dateStr}.`
            }
          });
        }
      }

      // CANCELED из будущей записи — уведомить клиента
      if (status === "CANCELED" && appt.start > new Date()) {
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

    await safeLogAudit({
      action: "APPOINTMENT_STATUS_CHANGE",
      actorUserId: ctx.userId,
      actorRole: ctx.user.role ?? "PSYCHOLOGIST",
      targetType: "Appointment",
      targetId: id,
      meta: {
        fromStatus: appt.status,
        toStatus: status,
        wasPendingBefore,
        clientAddedToList
      },
      ip: getClientIp(request)
    });

    await safeLogClientHistory({
      clientId: appt.clientId,
      type: ClientHistoryType.APPOINTMENT_STATUS_CHANGED,
      actorUserId: ctx.userId,
      meta: {
        appointmentId: id,
        fromStatus: appt.status,
        toStatus: status,
        start: appt.start.toISOString(),
        clientAddedToList
      }
    });

    // Telegram-уведомление клиенту при подтверждении или отмене будущей записи
    const clientUserId = appt.client?.userId;
    if (
      clientUserId &&
      (status === "SCHEDULED" || (status === "CANCELED" && appt.start > new Date()))
    ) {
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
