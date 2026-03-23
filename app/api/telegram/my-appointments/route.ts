import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { assertModuleEnabled } from "@/lib/platform-modules";

const BOT_SECRET_HEADER = "x-bot-secret";

/**
 * Список записей пользователя (клиент и/или психолог).
 * POST, тело: { chatId: string }. Заголовок X-Bot-Secret.
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

    const now = new Date();
    const statusFilter = [
      "SCHEDULED",
      "PENDING_CONFIRMATION"
    ] as const;

    type Item = {
      id: string;
      start: string;
      end: string;
      status: string;
      counterpartyName: string;
      proposedByPsychologist: boolean;
    };

    // ---- Шаг 1: записи «к вам» (вы — психолог, клиенты записаны к вам) ----
    // Простой запрос: psychologist.userId = вы. Без NOT, без хитростей.
    const psychRows = await prisma.appointment.findMany({
      where: {
        psychologist: { userId: user.id },
        status: { in: [...statusFilter] },
        start: { gte: now }
      },
      orderBy: { start: "asc" },
      include: {
        client: { select: { firstName: true, lastName: true } }
      }
    });

    const psychApptIds = new Set(psychRows.map((a) => a.id));

    const appointmentsAsPsychologist: Item[] = psychRows.map((a) => ({
      id: a.id,
      start: a.start.toISOString(),
      end: a.end.toISOString(),
      status: a.status,
      counterpartyName:
        [a.client.lastName, a.client.firstName].filter(Boolean).join(" ").trim() || "Клиент",
      proposedByPsychologist: a.proposedByPsychologist
    }));

    // ---- Шаг 2: записи «вы — клиент» (вы записаны к кому-то) ----
    // Все карточки ClientProfile, привязанные к вам по userId или email.
    const emailNorm = user.email?.trim().toLowerCase() ?? "";
    const orConditions: Array<{ userId: string } | { email: string }> = [
      { userId: user.id }
    ];
    if (emailNorm.length > 0) {
      orConditions.push({ email: emailNorm });
    }

    const clientProfiles = await prisma.clientProfile.findMany({
      where: { OR: orConditions },
      select: { id: true }
    });
    const clientIds = [...new Set(clientProfiles.map((c) => c.id))];

    let appointmentsAsClient: Item[] = [];
    if (clientIds.length > 0) {
      const clientRows = await prisma.appointment.findMany({
        where: {
          clientId: { in: clientIds },
          status: { in: [...statusFilter] },
          start: { gte: now }
        },
        orderBy: { start: "asc" },
        include: {
          psychologist: {
            select: { firstName: true, lastName: true, userId: true }
          }
        }
      });

      // Вычитаем:
      // 1) записи, уже попавшие в блок «к вам» (по ID),
      // 2) записи, где психолог — это мы сами (по psychologist.userId).
      appointmentsAsClient = clientRows
        .filter(
          (a) =>
            !psychApptIds.has(a.id) && a.psychologist.userId !== user.id
        )
        .map((a) => ({
          id: a.id,
          start: a.start.toISOString(),
          end: a.end.toISOString(),
          status: a.status,
          counterpartyName:
            [a.psychologist.lastName, a.psychologist.firstName]
              .filter(Boolean)
              .join(" ")
              .trim() || "Психолог",
          proposedByPsychologist: a.proposedByPsychologist
        }));
    }

    const hasPsych = appointmentsAsPsychologist.length > 0;
    const hasClient = appointmentsAsClient.length > 0;
    const role =
      hasPsych && hasClient ? "mixed" : hasPsych ? "psychologist" : "client";

    return NextResponse.json({
      role,
      hasPsychologistProfile: psychRows !== undefined,
      appointmentsAsPsychologist,
      appointmentsAsClient
    });
  } catch (err) {
    console.error("[POST /api/telegram/my-appointments]", err);
    return NextResponse.json(
      { message: "Ошибка сервера" },
      { status: 500 }
    );
  }
}
