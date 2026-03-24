import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { assertModuleEnabled } from "@/lib/platform-modules";
import { getClientIp, requireClientOrPsychologist } from "@/lib/security/api-guards";
import { safeLogAudit } from "@/lib/audit-log";
import { ClientHistoryType, safeLogClientHistory } from "@/lib/client-history";
import { sendTelegramMessage } from "@/lib/telegram";

type ParamsPromise = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: ParamsPromise) {
  try {
    const { id } = await params;
    const clientCtx = await requireClientOrPsychologist();
    if (!clientCtx.ok) return clientCtx.response;
    const mod = await assertModuleEnabled("scheduling");
    if (mod) return mod;
    const userId = clientCtx.userId;

    const body = await request.json().catch(() => null);
    const status = body?.status as
      | "PENDING_CONFIRMATION"
      | "SCHEDULED"
      | "COMPLETED"
      | "CANCELED"
      | undefined;

    if (!status) {
      return NextResponse.json(
        { message: "Не указан новый статус" },
        { status: 400 }
      );
    }

    const appt = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client: { select: { userId: true, firstName: true, lastName: true } },
        psychologist: { select: { userId: true, firstName: true, lastName: true } }
      }
    });

    if (!appt || !appt.client || appt.client.userId !== userId) {
      return NextResponse.json(
        { message: "Запись не найдена" },
        { status: 404 }
      );
    }

    const proposedByPsychologist = appt.proposedByPsychologist;

    if (status === "SCHEDULED") {
      if (appt.status !== "PENDING_CONFIRMATION" || !proposedByPsychologist) {
        return NextResponse.json(
          { message: "Эту запись нельзя подтвердить клиенту" },
          { status: 400 }
        );
      }
    } else if (status === "CANCELED") {
      if (
        appt.status !== "PENDING_CONFIRMATION" &&
        appt.status !== "SCHEDULED"
      ) {
        return NextResponse.json(
          { message: "Эту запись нельзя отменить" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { message: "Недопустимый статус для изменения клиентом" },
        { status: 400 }
      );
    }

    const clientName = appt.client
      ? `${(appt.client.lastName ?? "").trim()} ${(appt.client.firstName ?? "").trim()}`.trim() || "Клиент"
      : "Клиент";

    const dateStr = appt.start.toLocaleString("ru-RU", {
      dateStyle: "short",
      timeStyle: "short"
    });

    const result = await prisma.$transaction(async tx => {
      const slotIdToFree = appt.slotId;

      const updated = await tx.appointment.update({
        where: { id: appt.id },
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

      // Уведомление психологу в БД
      const psychUserId = appt.psychologist?.userId;
      if (psychUserId) {
        if (status === "CANCELED") {
          await tx.notification.create({
            data: {
              userId: psychUserId,
              title: "Запись отменена клиентом",
              body: `Клиент ${clientName} отменил(а) запись на приём ${dateStr}.`
            }
          });
        } else if (status === "SCHEDULED") {
          await tx.notification.create({
            data: {
              userId: psychUserId,
              title: "Клиент подтвердил запись",
              body: `Клиент ${clientName} подтвердил(а) запись на приём ${dateStr}.`
            }
          });
        }
      }

      return updated;
    });

    void safeLogAudit({
      action: status === "CANCELED" ? "APPOINTMENT_CLIENT_CANCELED" : "APPOINTMENT_CLIENT_CONFIRMED",
      actorUserId: userId,
      actorRole: "CLIENT",
      targetType: "Appointment",
      targetId: id,
      meta: { previousStatus: appt.status, newStatus: status },
      ip: getClientIp(request)
    });

    void safeLogClientHistory({
      clientId: appt.clientId,
      type: ClientHistoryType.APPOINTMENT_STATUS_CHANGED,
      actorUserId: userId,
      meta: {
        appointmentId: id,
        previousStatus: appt.status,
        newStatus: status,
        fromStatus: appt.status,
        toStatus: status,
        start: appt.start.toISOString(),
        initiatedBy: "client"
      }
    });

    // Telegram психологу
    const psychUserId = appt.psychologist?.userId;
    if (psychUserId && (status === "CANCELED" || status === "SCHEDULED")) {
      const psychUser = await prisma.user.findUnique({
        where: { id: psychUserId },
        select: { telegramChatId: true }
      });
      if (psychUser?.telegramChatId) {
        const text =
          status === "CANCELED"
            ? `❌ Клиент отменил запись.\n\nКлиент ${clientName} отменил(а) запись на приём ${dateStr}.`
            : `✅ Клиент подтвердил запись.\n\nКлиент ${clientName} подтвердил(а) запись на приём ${dateStr}.`;
        await sendTelegramMessage(psychUser.telegramChatId, text).catch(console.error);
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[PATCH /api/client/appointments/[id]]", err);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
