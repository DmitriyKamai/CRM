import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { assertModuleEnabled } from "@/lib/platform-modules";
import { getClientIp, requirePsychologist } from "@/lib/security/api-guards";
import { safeLogAudit } from "@/lib/audit-log";
import { updateSlotSchema } from "@/lib/schemas";

type ParamsPromise = {
  params: Promise<{
    id: string;
  }>;
};

// Обновление/отмена/удаление слота
export async function PATCH(request: Request, { params }: ParamsPromise) {
  const { id } = await params;
  const ctx = await requirePsychologist();
  if (!ctx.ok) return ctx.response;
  const mod = await assertModuleEnabled("scheduling");
  if (mod) return mod;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Неверный JSON" }, { status: 400 });
  }

  const parseResult = updateSlotSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { message: "Ошибка валидации", issues: parseResult.error.issues },
      { status: 400 }
    );
  }

  const { status, start, durationMinutes } = parseResult.data;

  if (!status && !start && !durationMinutes) {
    return NextResponse.json(
      { message: "Нет данных для обновления слота" },
      { status: 400 }
    );
  }

  const existing = await prisma.scheduleSlot.findUnique({
    where: { id }
  });

  if (!existing) {
    return NextResponse.json(
      { message: "Слот не найден" },
      { status: 404 }
    );
  }

  if (existing.psychologistId !== ctx.psychologistId) {
    return NextResponse.json(
      { message: "Слот не найден" },
      { status: 404 }
    );
  }

  let nextStart = existing.start;
  if (start) {
    nextStart = new Date(start);
  }

  const currentDurationMinutes =
    (existing.end.getTime() - existing.start.getTime()) / 60000;
  const nextDuration =
    typeof durationMinutes === "number" && durationMinutes > 0
      ? durationMinutes
      : currentDurationMinutes;

  const nextEnd = new Date(nextStart.getTime() + nextDuration * 60 * 1000);

  // Блокируем пересечения с другими слотами этого психолога.
  // Условие пересечения: nextStart < other.end && nextEnd > other.start
  const overlap = await prisma.scheduleSlot.findFirst({
    where: {
      psychologistId: existing.psychologistId,
      id: { not: existing.id },
      start: { lt: nextEnd },
      end: { gt: nextStart }
    },
    select: { id: true }
  });

  if (overlap) {
    return NextResponse.json(
      {
        message:
          "Новый интервал пересекается с другим слотом. Измените время начала или длительность."
      },
      { status: 409 }
    );
  }

  const updateData: {
    status?: "FREE" | "BOOKED" | "CANCELED";
    start?: Date;
    end?: Date;
  } = {};

  if (status) {
    updateData.status = status;
  }
  updateData.start = nextStart;
  updateData.end = nextEnd;

  const slot = await prisma.scheduleSlot.update({
    where: { id },
    data: updateData
  });

  await safeLogAudit({
    action: "SCHEDULE_SLOT_UPDATE",
    actorUserId: ctx.userId,
    actorRole: ctx.user.role ?? "PSYCHOLOGIST",
    targetType: "ScheduleSlot",
    targetId: id,
    meta: {
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      status: slot.status
    },
    ip: getClientIp(request)
  });

  return NextResponse.json(slot);
}

export async function DELETE(_request: Request, { params }: ParamsPromise) {
  const { id } = await params;
  const ctx = await requirePsychologist();
  if (!ctx.ok) return ctx.response;
  const mod = await assertModuleEnabled("scheduling");
  if (mod) return mod;

  const slot = await prisma.scheduleSlot.findUnique({
    where: { id },
    include: { appointment: true }
  });

  if (!slot) {
    return NextResponse.json(
      { message: "Слот не найден" },
      { status: 404 }
    );
  }

  if (slot.psychologistId !== ctx.psychologistId) {
    return NextResponse.json(
      { message: "Слот не найден" },
      { status: 404 }
    );
  }

  if (slot.appointment) {
    return NextResponse.json(
      { message: "Нельзя удалить слот с записью. Отмените запись." },
      { status: 400 }
    );
  }

  await prisma.scheduleSlot.delete({
    where: { id }
  });

  await safeLogAudit({
    action: "SCHEDULE_SLOT_DELETE",
    actorUserId: ctx.userId,
    actorRole: ctx.user.role ?? "PSYCHOLOGIST",
    targetType: "ScheduleSlot",
    targetId: id,
    meta: {
      status: slot.status,
      start: slot.start.toISOString(),
      end: slot.end.toISOString()
    },
    ip: getClientIp(_request)
  });

  return NextResponse.json({ ok: true });
}

