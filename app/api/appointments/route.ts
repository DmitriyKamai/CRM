import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendNewAppointmentToPsychologist } from "@/lib/telegram";

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

  let clientProfile = await prisma.clientProfile.findFirst({
    where: {
      userId,
      psychologistId: slot.psychologistId
    }
  });

  if (!clientProfile) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });
    const nameParts = (user?.name ?? "Клиент").trim().split(/\s+/);
    const firstName = nameParts[0] ?? "Клиент";
    const lastName = nameParts.slice(1).join(" ") || "";
    try {
      clientProfile = await prisma.clientProfile.create({
        data: {
          userId,
          psychologistId: slot.psychologistId,
          email: user?.email ?? undefined,
          firstName,
          lastName
        }
      });
    } catch (createErr: unknown) {
      if (createErr && typeof createErr === "object" && (createErr as { code?: string }).code === "P2002") {
        const existing = await prisma.clientProfile.findFirst({
          where: { userId, psychologistId: slot.psychologistId }
        });
        if (existing) clientProfile = existing;
      }
      if (!clientProfile) throw createErr;
    }
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

    // Уведомление психологу в Telegram с кнопками «Подтвердить» / «Отменить»
    const [psychUser, client] = await Promise.all([
      prisma.psychologistProfile
        .findUnique({
          where: { id: result.psychologistId },
          select: { userId: true }
        })
        .then(p =>
          p
            ? prisma.user.findUnique({
                where: { id: p.userId },
                select: { telegramChatId: true }
              })
            : null
        ),
      prisma.clientProfile.findUnique({
        where: { id: result.clientId },
        select: { firstName: true, lastName: true }
      })
    ]);
    const clientName = client
      ? `${(client.lastName ?? "").trim()} ${(client.firstName ?? "").trim()}`.trim() || "Клиент"
      : "Клиент";
    const dateStr = result.start.toLocaleString("ru-RU", {
      dateStyle: "short",
      timeStyle: "short"
    });
    if (psychUser?.telegramChatId) {
      const sent = await sendNewAppointmentToPsychologist(
        psychUser.telegramChatId,
        result.id,
        clientName,
        dateStr
      ).catch((err) => {
        console.error("[appointments] Ошибка отправки уведомления в Telegram:", err);
        return false;
      });
      if (!sent) {
        console.warn("[appointments] Не удалось отправить уведомление психологу в Telegram (chatId:", psychUser.telegramChatId, ")");
      }
    } else {
      console.warn("[appointments] У психолога не привязан Telegram (userId по psychologistId не найден или telegramChatId пустой) — уведомление не отправлено.");
    }

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

