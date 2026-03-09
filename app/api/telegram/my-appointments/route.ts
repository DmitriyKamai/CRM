import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

const BOT_SECRET_HEADER = "x-bot-secret";

/**
 * Список предстоящих записей пользователя (клиент или психолог).
 * POST, тело: { chatId: number }. Заголовок X-Bot-Secret.
 */
export async function POST(request: Request) {
  try {
    const secret = request.headers.get(BOT_SECRET_HEADER);
    const expected = process.env.TELEGRAM_BOT_SECRET;
    if (!expected || secret !== expected) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const chatId =
      typeof body?.chatId === "number"
        ? body.chatId
        : typeof body?.chatId === "string"
          ? Number(body.chatId)
          : null;

    if (chatId == null || Number.isNaN(chatId)) {
      return NextResponse.json(
        { message: "Нужен chatId" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { telegramChatId: String(chatId) },
      select: { id: true, role: true }
    });

    if (!user) {
      return NextResponse.json(
        { message: "Пользователь не найден. Привяжите Telegram в настройках на сайте." },
        { status: 404 }
      );
    }

    const now = new Date();
    const statuses = ["SCHEDULED", "PENDING_CONFIRMATION"] as const;

    if (user.role === "PSYCHOLOGIST") {
      const profile = await prisma.psychologistProfile.findUnique({
        where: { userId: user.id },
        select: { id: true }
      });
      if (!profile) {
        return NextResponse.json({ appointments: [] });
      }

      const appointments = await prisma.appointment.findMany({
        where: {
          psychologistId: profile.id,
          status: { in: [...statuses] },
          start: { gte: now }
        },
        orderBy: { start: "asc" },
        include: {
          client: { select: { firstName: true, lastName: true } }
        }
      });

      return NextResponse.json({
        role: "psychologist",
        appointments: appointments.map((a) => ({
          id: a.id,
          start: a.start.toISOString(),
          end: a.end.toISOString(),
          status: a.status,
          clientName: [a.client.lastName, a.client.firstName].filter(Boolean).join(" ").trim() || "Клиент"
        }))
      });
    }

    if (user.role === "CLIENT") {
      const clientProfiles = await prisma.clientProfile.findMany({
        where: { userId: user.id },
        select: { id: true }
      });
      const clientIds = clientProfiles.map((c) => c.id);

      const appointments = await prisma.appointment.findMany({
        where: {
          clientId: { in: clientIds },
          status: { in: [...statuses] },
          start: { gte: now }
        },
        orderBy: { start: "asc" },
        include: {
          psychologist: { select: { firstName: true, lastName: true } }
        }
      });

      return NextResponse.json({
        role: "client",
        appointments: appointments.map((a) => ({
          id: a.id,
          start: a.start.toISOString(),
          end: a.end.toISOString(),
          status: a.status,
          psychologistName: [a.psychologist.lastName, a.psychologist.firstName].filter(Boolean).join(" ").trim() || "Психолог"
        }))
      });
    }

    return NextResponse.json({ appointments: [] });
  } catch (err) {
    console.error("[POST /api/telegram/my-appointments]", err);
    return NextResponse.json(
      { message: "Ошибка сервера" },
      { status: 500 }
    );
  }
}
