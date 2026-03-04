import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user as any).role !== "CLIENT") {
    return NextResponse.json({ message: "Доступ запрещён" }, { status: 403 });
  }

  const userId = (session.user as any).id as string;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.slotId !== "string") {
    return NextResponse.json(
      { message: "Не указан слот для записи" },
      { status: 400 }
    );
  }
  const slotId = body.slotId as string;

  const slot = await prisma.scheduleSlot.findUnique({
    where: { id: slotId },
    select: { psychologistId: true }
  });
  if (!slot) {
    return NextResponse.json(
      { message: "Слот не найден" },
      { status: 400 }
    );
  }

  const clientProfile = await prisma.clientProfile.findFirst({
    where: {
      userId,
      psychologistId: slot.psychologistId
    }
  });
  if (!clientProfile) {
    return NextResponse.json(
      { message: "Профиль клиента у этого психолога не найден. Обратитесь к психологу для добавления в список." },
      { status: 400 }
    );
  }
  const clientId = clientProfile.id;

  const ip =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const allowed = checkRateLimit({
    key: `appointment:${clientId}:${ip}`,
    windowMs: 10 * 60 * 1000,
    max: 30
  });

  if (!allowed) {
    return NextResponse.json(
      { message: "Слишком много попыток записи, попробуйте позже" },
      { status: 429 }
    );
  }

  try {
    const result = await prisma.$transaction(async tx => {
      const slot = await tx.scheduleSlot.findUnique({
        where: { id: slotId }
      });

      if (!slot) {
        throw new Error("Слот не найден");
      }
      if (slot.status !== "FREE") {
        throw new Error("Слот уже занят или недоступен");
      }

      const appointment = await tx.appointment.create({
        data: {
          slotId: slot.id,
          psychologistId: slot.psychologistId,
          clientId,
          start: slot.start,
          end: slot.end,
          status: "PENDING_CONFIRMATION"
        }
      });

      await tx.scheduleSlot.update({
        where: { id: slot.id },
        data: {
          status: "BOOKED"
        }
      });

      // Уведомление психологу: клиент записался
      const psychologist = await tx.psychologistProfile.findUnique({
        where: { id: slot.psychologistId },
        select: { userId: true }
      });
      const client = await tx.clientProfile.findUnique({
        where: { id: clientId },
        select: { firstName: true, lastName: true }
      });
      const clientName = client
        ? `${client.lastName} ${client.firstName}`.trim() || "Клиент"
        : "Клиент";
      const dateStr = slot.start.toLocaleString("ru-RU", {
        dateStyle: "short",
        timeStyle: "short"
      });
      if (psychologist?.userId) {
        await tx.notification.create({
          data: {
            userId: psychologist.userId,
            title: "Новая запись на приём",
            body: `Клиент ${clientName} записался на приём ${dateStr}. Ожидает подтверждения.`
          }
        });
      }

      return appointment;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Appointment error", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "Этот слот уже занят. Обновите список слотов и выберите другой." },
        { status: 409 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Не удалось создать запись";
    return NextResponse.json({ message }, { status: 400 });
  }
}

