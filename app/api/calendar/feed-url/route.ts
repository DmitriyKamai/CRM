import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import {
  getOrCreateCalendarFeedToken,
  rotateCalendarFeedToken
} from "@/lib/calendar-feed-token";
import { requirePsychologist } from "@/lib/security/api-guards";

function calendarBaseUrl(request: NextRequest): string {
  return (
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof request.url === "string" ? new URL(request.url).origin : "http://localhost:3000")
  );
}

/** GET /api/calendar/feed-url — текущая ссылка на ICS (токен хранится в БД). */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;

    const token = await getOrCreateCalendarFeedToken(prisma, ctx.psychologistId);
    const baseUrl = calendarBaseUrl(request);
    const url = `${baseUrl}/api/calendar/feed?token=${encodeURIComponent(token)}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[GET /api/calendar/feed-url]", err);
    return NextResponse.json(
      { message: "Не удалось сформировать ссылку" },
      { status: 500 }
    );
  }
}

/** POST /api/calendar/feed-url — перевыпустить токен (старые подписки перестанут обновляться). */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;

    const token = await rotateCalendarFeedToken(prisma, ctx.psychologistId);
    const baseUrl = calendarBaseUrl(request);
    const url = `${baseUrl}/api/calendar/feed?token=${encodeURIComponent(token)}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[POST /api/calendar/feed-url]", err);
    return NextResponse.json(
      { message: "Не удалось обновить ссылку" },
      { status: 500 }
    );
  }
}
