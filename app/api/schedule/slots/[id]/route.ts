import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requirePsychologist } from "@/lib/security/api-guards";

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

  const body = await request.json().catch(() => null);
  const status = body?.status as "FREE" | "BOOKED" | "CANCELED" | undefined;
  const start = typeof body?.start === "string" ? (body.start as string) : undefined;
  const durationMinutes =
    typeof body?.durationMinutes === "number" ? (body.durationMinutes as number) : undefined;

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

  let nextStart = existing.start;
  if (start) {
    const parsed = new Date(start);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json(
        { message: "Неверный формат даты начала" },
        { status: 400 }
      );
    }
    nextStart = parsed;
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

  return NextResponse.json(slot);
}

export async function DELETE(_request: Request, { params }: ParamsPromise) {
  const { id } = await params;
  const ctx = await requirePsychologist();
  if (!ctx.ok) return ctx.response;

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

  return NextResponse.json({ ok: true });
}

