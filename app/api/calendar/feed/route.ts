import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyCalendarFeedToken, buildIcs } from "@/lib/calendar-feed";

/** GET /api/calendar/feed?token=... — фид календаря в формате ICS (для подписки в Google/Apple Calendar). */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return new NextResponse("Не указан токен", { status: 400 });
    }

    const psychologistId = verifyCalendarFeedToken(token);
    if (!psychologistId) {
      return new NextResponse("Недействительная ссылка", { status: 403 });
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
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { message: message ? `Ошибка сервера: ${message}` : "Ошибка сервера" },
      { status: 500 }
    );
  }
}
