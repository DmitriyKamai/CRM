import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { buildIcs } from "@/lib/calendar-feed";
import { getPlatformModuleFlags } from "@/lib/platform-modules";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security/api-guards";

async function resolvePsychologistIdForFeed(token: string): Promise<string | null> {
  const row = await prisma.calendarFeedToken.findUnique({
    where: { token },
    select: { psychologistId: true }
  });
  return row?.psychologistId ?? null;
}

/** GET /api/calendar/feed?token=... — фид календаря в формате ICS (для подписки в Google/Apple Calendar). */
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const allowed = await checkRateLimit({
      key: `calendar-feed:ip:${ip}`,
      windowMs: 10 * 60 * 1000,
      max: 600
    });
    if (!allowed) {
      return new NextResponse("Слишком много запросов", { status: 429 });
    }

    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return new NextResponse("Не указан токен", { status: 400 });
    }

    const psychologistId = await resolvePsychologistIdForFeed(token);
    if (!psychologistId) {
      return new NextResponse("Недействительная ссылка", { status: 403 });
    }

    const modules = await getPlatformModuleFlags();
    if (!modules.scheduling) {
      return new NextResponse("Календарь недоступен", { status: 403 });
    }

    const profile = await prisma.psychologistProfile.findUnique({
      where: { id: psychologistId },
      select: { id: true, firstName: true, lastName: true }
    });
    if (!profile) {
      return new NextResponse("Календарь не найден", { status: 404 });
    }

    const now = new Date();
    const oneYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const slots = await prisma.scheduleSlot.findMany({
      where: {
        psychologistId: profile.id,
        start: { gte: now, lte: oneYear }
      },
      orderBy: { start: "asc" },
      include: {
        appointment: {
          include: { client: true }
        }
      }
    });

    const calendarName = `Расписание${profile.lastName || profile.firstName ? ` — ${[profile.lastName, profile.firstName].filter(Boolean).join(" ")}` : ""}`;
    const slotsForIcs = slots.map(slot => {
      const appt = slot.appointment;
      const isActive =
        appt &&
        (appt.status === "SCHEDULED" || appt.status === "PENDING_CONFIRMATION");
      const summary = isActive && appt?.client
        ? `Приём: ${appt.client.lastName} ${appt.client.firstName}`
        : "Слот";
      return {
        id: slot.id,
        start: slot.start,
        end: slot.end,
        summary
      };
    });

    const ics = buildIcs(slotsForIcs, calendarName);

    void prisma.calendarFeedToken
      .update({
        where: { token },
        data: { lastFetchedAt: new Date() }
      })
      .catch(() => {
        /* не блокируем выдачу фида */
      });

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="schedule.ics"',
        "Cache-Control": "private, max-age=300"
      }
    });
  } catch (err) {
    console.error("[GET /api/calendar/feed]", err);
    return new NextResponse("Внутренняя ошибка сервера", { status: 500 });
  }
}
