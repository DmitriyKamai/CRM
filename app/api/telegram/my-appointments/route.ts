import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { assertModuleEnabled } from "@/lib/platform-modules";

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

    const mod = await assertModuleEnabled("scheduling");
    if (mod) return mod;

    const body = await request.json().catch(() => null);
    // Строка целиком — без Number(), чтобы не терять точность у больших chat_id.
    const raw = body?.chatId;
    const chatIdStr =
      raw !== null && raw !== undefined && String(raw).trim() !== ""
        ? String(raw).trim()
        : null;

    if (!chatIdStr || !/^-?\d+$/.test(chatIdStr)) {
      return NextResponse.json(
        { message: "Нужен chatId" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { telegramChatId: chatIdStr },
      select: { id: true, role: true, email: true }
    });

    if (!user) {
      return NextResponse.json(
        { message: "Пользователь не найден. Привяжите Telegram в настройках на сайте." },
        { status: 404 }
      );
    }

    /** Не показываем отменённые. Учитываем COMPLETED и недавнее прошлое — иначе после приёма список «пустой». */
    const fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const activeStatuses = [
      "SCHEDULED",
      "PENDING_CONFIRMATION",
      "COMPLETED"
    ] as const;

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
          status: { in: [...activeStatuses] },
          start: { gte: fromDate }
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
      const emailNorm = user.email?.trim().toLowerCase() ?? "";
      const clientProfiles = await prisma.clientProfile.findMany({
        where: {
          OR: [
            { userId: user.id },
            ...(emailNorm.length > 0 ? [{ email: emailNorm }] : [])
          ]
        },
        select: { id: true }
      });
      const clientIds = [...new Set(clientProfiles.map((c) => c.id))];

      if (clientIds.length === 0) {
        return NextResponse.json({ role: "client", appointments: [] });
      }

      const appointments = await prisma.appointment.findMany({
        where: {
          clientId: { in: clientIds },
          status: { in: [...activeStatuses] },
          start: { gte: fromDate }
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
