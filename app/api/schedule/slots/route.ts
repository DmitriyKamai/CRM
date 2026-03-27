import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { assertModuleEnabled } from "@/lib/platform-modules";
import { withPrismaLock } from "@/lib/prisma-request-lock";
import { requirePsychologist } from "@/lib/security/api-guards";

export async function GET() {
  try {
    return await withPrismaLock(async () => {
  const mod = await assertModuleEnabled("scheduling");
  if (mod) return mod;
  const ctx = await requirePsychologist();
  if (!ctx.ok) return ctx.response;

  const now = new Date();
  const slots = await prisma.scheduleSlot.findMany({
    where: {
      psychologistId: ctx.psychologistId,
      start: {
        gte: new Date(now.getTime() - 1000 * 60 * 60 * 24) // сутки назад для контекста
      }
    },
    orderBy: { start: "asc" },
    include: {
      appointment: {
        include: {
          client: true
        }
      }
    }
  });

  return NextResponse.json(
    slots.map(slot => {
        const appt = slot.appointment;
        const isActive =
          appt &&
          (appt.status === "SCHEDULED" || appt.status === "PENDING_CONFIRMATION");
        const appointment = isActive ? appt : null;
        const isStuck =
          slot.status === "BOOKED" &&
          (!slot.appointment ||
            (slot.appointment.status !== "SCHEDULED" &&
              slot.appointment.status !== "PENDING_CONFIRMATION"));
        return {
          id: slot.id,
          start: slot.start,
          end: slot.end,
          status: isStuck || (slot.status === "BOOKED" && !appointment) ? "FREE" : slot.status,
          appointmentId: appointment?.id ?? null,
          appointmentStatus: appointment?.status ?? null,
          clientId: appointment?.client?.id ?? null,
          clientName: appointment?.client
            ? `${appointment.client.lastName} ${appointment.client.firstName}`
            : null,
          proposedByPsychologist: appointment?.proposedByPsychologist ?? false
        };
      })
  );
  });
  } catch (err) {
    console.error("[GET /api/schedule/slots]", err);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
  const mod = await assertModuleEnabled("scheduling");
  if (mod) return mod;
  const ctx = await requirePsychologist();
  if (!ctx.ok) return ctx.response;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { message: "Некорректное тело запроса" },
      { status: 400 }
    );
  }

  const { start, durationMinutes } = body as {
    start?: string;
    durationMinutes?: number;
  };

  if (!start || typeof start !== "string") {
    return NextResponse.json(
      { message: "Не указано время начала" },
      { status: 400 }
    );
  }

  const duration =
    typeof durationMinutes === "number" && durationMinutes > 0
      ? durationMinutes
      : 50;

  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) {
    return NextResponse.json(
      { message: "Неверный формат даты" },
      { status: 400 }
    );
  }

  const now = new Date();
  if (startDate.getTime() <= now.getTime()) {
    return NextResponse.json(
      { message: "Нельзя создать слот на прошедшее время" },
      { status: 400 }
    );
  }

  const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

  // Проверяем, нет ли пересечения по времени с уже существующими слотами
  // Условие пересечения интервалов:
  // newStart < existingEnd && newEnd > existingStart
  const overlapping = await prisma.scheduleSlot.findFirst({
    where: {
      psychologistId: ctx.psychologistId,
      start: {
        lt: endDate
      },
      end: {
        gt: startDate
      }
    }
  });

  if (overlapping) {
    return NextResponse.json(
      {
        message:
          "Новый слот пересекается по времени с уже существующим. Измените время начала или длительность."
      },
      { status: 409 }
    );
  }

  const slot = await prisma.scheduleSlot.create({
    data: {
      psychologistId: ctx.psychologistId,
      start: startDate,
      end: endDate
    }
  });

  return NextResponse.json(slot, { status: 201 });
  } catch (err) {
    console.error("[POST /api/schedule/slots]", err);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

