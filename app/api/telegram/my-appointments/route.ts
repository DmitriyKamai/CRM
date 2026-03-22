import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { assertModuleEnabled } from "@/lib/platform-modules";

const BOT_SECRET_HEADER = "x-bot-secret";

/**
 * Список записей пользователя (клиент или психолог).
 * POST, тело: { chatId: string, range?: "upcoming" | "history" }.
 * По умолчанию history: start за последние 90 дней (как в CRM). upcoming — только start >= сейчас (часовой пояс сервера).
 * Заголовок X-Bot-Secret.
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
    const range = body?.range === "upcoming" ? "upcoming" : "history";
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

    const fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const startTimeFilter =
      range === "upcoming" ? { gte: now } : { gte: fromDate };
    const activeStatuses = [
      "SCHEDULED",
      "PENDING_CONFIRMATION",
      "COMPLETED"
    ] as const;

    const emailNorm = user.email?.trim().toLowerCase() ?? "";

    /** Нужен раньше запроса карточек «как клиент», чтобы отсечь «я — клиент у самого себя». */
    const psychProfile = await prisma.psychologistProfile.findUnique({
      where: { userId: user.id },
      select: { id: true }
    });
    const ownPsychologistId = psychProfile?.id;

    // Карточки для визитов К ДРУГИМ специалистам: не берём ClientProfile с psychologistId = свой профиль
    // при том же userId/email — иначе записи «к вам на приём» дублируются в «вы записаны» с вашим же ФИО.
    const clientProfileWhere: Prisma.ClientProfileWhereInput = {
      OR: [
        ownPsychologistId
          ? {
              userId: user.id,
              NOT: { psychologistId: ownPsychologistId }
            }
          : { userId: user.id },
        ...(emailNorm.length > 0
          ? [
              {
                email: { equals: emailNorm, mode: "insensitive" as const },
                ...(ownPsychologistId
                  ? { NOT: { psychologistId: ownPsychologistId } }
                  : {})
              }
            ]
          : [])
      ]
    };

    const clientProfiles = await prisma.clientProfile.findMany({
      where: clientProfileWhere,
      select: { id: true }
    });
    const clientIds = [...new Set(clientProfiles.map((c) => c.id))];

    // «Вы записаны к специалисту» — никогда не показывать приём, где врач — вы сами (чужой userId у PsychologistProfile).
    const clientAppointmentsWhere: Prisma.AppointmentWhereInput = {
      clientId: { in: clientIds },
      status: { in: [...activeStatuses] },
      start: startTimeFilter,
      NOT: { psychologist: { userId: user.id } }
    };

    const clientAppointments =
      clientIds.length === 0
        ? []
        : await prisma.appointment.findMany({
            where: clientAppointmentsWhere,
            orderBy: { start: "asc" },
            include: {
              psychologist: { select: { firstName: true, lastName: true } }
            }
          });

    // Записи как психолог: по PsychologistProfile, не только по role=PSYCHOLOGIST
    /** Одна запись для бота: без слияния «к вам» / «вы идёте» в один список — иначе путаются имена. */
    type Item = {
      id: string;
      start: string;
      end: string;
      status: string;
      /** К вам на приём — имя клиента; ваш визит — имя специалиста */
      counterpartyName: string;
    };

    // «К вам»: по связи psychologist.userId — эквивалент psychologistId, но не зависит от лишнего шага;
    // если PsychologistProfile есть, записи всё равно матчятся по владельцу профиля.
    const psychRows = await prisma.appointment.findMany({
      where: {
        psychologist: { userId: user.id },
        status: { in: [...activeStatuses] },
        start: startTimeFilter
      },
      orderBy: { start: "asc" },
      include: {
        client: { select: { firstName: true, lastName: true } }
      }
    });
    const appointmentsAsPsychologist: Item[] = psychRows.map((a) => {
      const clientName =
        [a.client.lastName, a.client.firstName].filter(Boolean).join(" ").trim() || "Клиент";
      return {
        id: a.id,
        start: a.start.toISOString(),
        end: a.end.toISOString(),
        status: a.status,
        counterpartyName: clientName
      };
    });

    const appointmentsAsClient: Item[] = clientAppointments.map((a) => {
      const psychologistName =
        [a.psychologist.lastName, a.psychologist.firstName].filter(Boolean).join(" ").trim() || "Психолог";
      return {
        id: a.id,
        start: a.start.toISOString(),
        end: a.end.toISOString(),
        status: a.status,
        counterpartyName: psychologistName
      };
    });

    const hasPsych = appointmentsAsPsychologist.length > 0;
    const hasClient = appointmentsAsClient.length > 0;
    const role =
      hasPsych && hasClient ? "mixed" : hasPsych ? "psychologist" : "client";

    return NextResponse.json({
      role,
      range,
      /** Есть ли в БД PsychologistProfile у этого пользователя (для подсказки в боте) */
      hasPsychologistProfile: Boolean(psychProfile),
      /** Приёмы к вам как к специалисту — в строке имя клиента */
      appointmentsAsPsychologist,
      /** Ваши записи к другим специалистам — в строке имя психолога */
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
