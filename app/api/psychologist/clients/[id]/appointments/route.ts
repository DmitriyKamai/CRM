import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { assertModuleEnabled } from "@/lib/platform-modules";
import { requirePsychologist } from "@/lib/security/api-guards";
import { sendAppointmentProposalToClient } from "@/lib/telegram";

type ParamsPromise = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_req: Request, { params }: ParamsPromise) {
  const { id } = await params;
  const ctx = await requirePsychologist();
  if (!ctx.ok) return ctx.response;
  const mod = await assertModuleEnabled("scheduling");
  if (mod) return mod;

  const client = await prisma.clientProfile.findFirst({
    where: {
      id,
      psychologistId: ctx.psychologistId
    },
    select: { id: true }
  });

  if (!client) {
    return NextResponse.json({ message: "Клиент не найден" }, { status: 404 });
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      psychologistId: ctx.psychologistId,
      clientId: client.id
    },
    orderBy: {
      start: "desc"
    }
  });

  const now = new Date();

  // Прошедшие неподтверждённые записи удаляем — они больше не актуальны
  const pastPending = appointments.filter(
    a => a.status === "PENDING_CONFIRMATION" && a.end < now
  );
  if (pastPending.length > 0) {
    const pastPendingIds = pastPending.map(a => a.id);
    const pastPendingSlotIds = pastPending
      .filter(a => a.slotId !== null)
      .map(a => a.slotId as string);
    await prisma.$transaction(async tx => {
      await tx.appointment.deleteMany({ where: { id: { in: pastPendingIds } } });
      if (pastPendingSlotIds.length > 0) {
        await tx.scheduleSlot.updateMany({
          where: { id: { in: pastPendingSlotIds } },
          data: { status: "FREE" }
        });
      }
    });
  }

  // Возвращаем без отменённых и удалённых просроченных
  const pastPendingIds = new Set(pastPending.map(a => a.id));
  const toReturn = appointments.filter(
    a => a.status !== "CANCELED" && !pastPendingIds.has(a.id)
  );

  return NextResponse.json(
    toReturn.map(a => ({
      id: a.id,
      start: a.start.toISOString(),
      end: a.end.toISOString(),
      status: a.status,
      proposedByPsychologist: a.proposedByPsychologist
    }))
  );
}

export async function POST(request: Request, { params }: ParamsPromise) {
  try {
    const { id } = await params;
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;
    const mod = await assertModuleEnabled("scheduling");
    if (mod) return mod;

    const psychProfile = await prisma.psychologistProfile.findUnique({
      where: { id: ctx.psychologistId },
      select: { user: { select: { firstName: true, lastName: true, name: true } } }
    });

    const client = await prisma.clientProfile.findFirst({
      where: {
        id,
        psychologistId: ctx.psychologistId
      },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true
      }
    });

    if (!client) {
      return NextResponse.json({ message: "Клиент не найден" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const startIso = body?.start as string | undefined;
    const durationMinutes = Number(body?.durationMinutes ?? 0);

    if (!startIso || Number.isNaN(durationMinutes) || durationMinutes <= 0) {
      return NextResponse.json(
        { message: "Укажите дату и длительность приёма" },
        { status: 400 }
      );
    }

    const start = new Date(startIso);
    if (Number.isNaN(start.getTime())) {
      return NextResponse.json(
        { message: "Неверный формат даты начала" },
        { status: 400 }
      );
    }

    if (start <= new Date()) {
      return NextResponse.json(
        { message: "Нельзя создать запись на прошедшее время" },
        { status: 400 }
      );
    }

    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    // Нельзя создать запись, если интервал пересекается с любым существующим слотом.
    // Иначе в сетке могут появиться пересекающиеся интервалы.
    const overlap = await prisma.scheduleSlot.findFirst({
      where: {
        psychologistId: ctx.psychologistId,
        start: { lt: end },
        end: { gt: start }
      },
      select: { id: true }
    });

    if (overlap) {
      return NextResponse.json(
        {
          message:
            "Нельзя создать запись: выбранное время пересекается с уже существующим слотом."
        },
        { status: 409 }
      );
    }

    const hasAccount = !!client.userId;
    const result = await prisma.$transaction(async tx => {
      const slot = await tx.scheduleSlot.create({
        data: {
          psychologistId: ctx.psychologistId,
          start,
          end,
          status: "BOOKED"
        }
      });

      const appointment = await tx.appointment.create({
        data: {
          slotId: slot.id,
          psychologistId: ctx.psychologistId,
          clientId: client.id,
          start,
          end,
          status: hasAccount ? "PENDING_CONFIRMATION" : "SCHEDULED",
          proposedByPsychologist: hasAccount
        }
      });

      if (hasAccount) {
        const dateStr = start.toLocaleString("ru-RU", {
          dateStyle: "short",
          timeStyle: "short"
        });
        const psychologistName = psychProfile
          ? [psychProfile.user?.lastName, psychProfile.user?.firstName]
              .filter(Boolean).join(" ").trim() ||
            psychProfile.user?.name ||
            "Психолог"
          : "Психолог";
        await tx.notification.create({
          data: {
            userId: client.userId!,
            title: "Предложена запись на приём",
            body: `Психолог ${psychologistName} предложил(а) вам запись на приём ${dateStr}. Подтвердите или отмените её в личном кабинете.`
          }
        });
      }

      return appointment;
    });

    // Telegram клиенту если запись предложена: отправляем сообщение с inline-кнопками Подтвердить/Отменить
    if (hasAccount && client.userId) {
      const clientUser = await prisma.user.findUnique({
        where: { id: client.userId },
        select: { telegramChatId: true }
      });
      if (clientUser?.telegramChatId) {
        const psychologistName = psychProfile
          ? [psychProfile.user?.lastName, psychProfile.user?.firstName]
              .filter(Boolean).join(" ").trim() ||
            psychProfile.user?.name ||
            "Психолог"
          : "Психолог";
        const dateStr = result.start.toLocaleString("ru-RU", {
          dateStyle: "short",
          timeStyle: "short"
        });
        sendAppointmentProposalToClient(
          clientUser.telegramChatId,
          result.id,
          psychologistName,
          dateStr
        ).catch(console.error);
      }
    }

    return NextResponse.json(
      {
        id: result.id,
        start: result.start.toISOString(),
        end: result.end.toISOString(),
        status: result.status,
        proposedByPsychologist: hasAccount
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create appointment for client error", error);
    return NextResponse.json(
      { message: "Не удалось создать запись" },
      { status: 400 }
    );
  }
}

