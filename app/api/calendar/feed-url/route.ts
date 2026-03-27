import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { assertModuleEnabled } from "@/lib/platform-modules";
import {
  getOrCreateCalendarFeedToken,
  rotateCalendarFeedToken
} from "@/lib/calendar-feed-token";
import { requirePsychologist } from "@/lib/security/api-guards";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security/api-guards";
import { safeLogAudit } from "@/lib/audit-log";

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
    const ip = getClientIp(request);
    const allowed = await checkRateLimit({
      key: `calendar-feed-url:get:ip:${ip}`,
      windowMs: 10 * 60 * 1000,
      max: 60
    });
    if (!allowed) {
      return NextResponse.json(
        { message: "Слишком много попыток. Попробуйте позже." },
        { status: 429 }
      );
    }

    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;
    const mod = await assertModuleEnabled("scheduling");
    if (mod) return mod;

    const token = await getOrCreateCalendarFeedToken(prisma, ctx.psychologistId);
    const baseUrl = calendarBaseUrl(request);
    const url = `${baseUrl}/api/calendar/feed/${token}`;
    const meta = await prisma.calendarFeedToken.findUnique({
      where: { psychologistId: ctx.psychologistId },
      select: { lastFetchedAt: true, createdAt: true }
    });
    return NextResponse.json({
      url,
      lastFetchedAt: meta?.lastFetchedAt?.toISOString() ?? null,
      createdAt: meta?.createdAt?.toISOString() ?? null
    });
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
    const ip = getClientIp(request);
    const allowed = await checkRateLimit({
      key: `calendar-feed-url:rotate:ip:${ip}`,
      windowMs: 60 * 60 * 1000,
      max: 10
    });
    if (!allowed) {
      return NextResponse.json(
        { message: "Слишком много попыток. Попробуйте позже." },
        { status: 429 }
      );
    }

    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;
    const mod = await assertModuleEnabled("scheduling");
    if (mod) return mod;

    const token = await rotateCalendarFeedToken(prisma, ctx.psychologistId);
    const baseUrl = calendarBaseUrl(request);
    const url = `${baseUrl}/api/calendar/feed/${token}`;
    const meta = await prisma.calendarFeedToken.findUnique({
      where: { psychologistId: ctx.psychologistId },
      select: { lastFetchedAt: true, createdAt: true }
    });

    await safeLogAudit({
      action: "CALENDAR_FEED_TOKEN_ROTATE",
      actorUserId: ctx.userId,
      actorRole: ctx.user.role ?? "PSYCHOLOGIST",
      targetType: "PsychologistProfile",
      targetId: ctx.psychologistId,
      meta: { reason: "rotate" },
      ip
    });

    return NextResponse.json({
      url,
      lastFetchedAt: meta?.lastFetchedAt?.toISOString() ?? null,
      createdAt: meta?.createdAt?.toISOString() ?? null
    });
  } catch (err) {
    console.error("[POST /api/calendar/feed-url]", err);
    return NextResponse.json(
      { message: "Не удалось обновить ссылку" },
      { status: 500 }
    );
  }
}
