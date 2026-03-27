import { NextResponse } from "next/server";

import { withPrismaLock } from "@/lib/prisma-request-lock";
import { cleanupScheduleSlotsGlobal } from "@/lib/schedule-slot-cleanup";

/**
 * Vercel Cron: GET с расписанием из `vercel.json`.
 *
 * Временно: раз в сутки (`0 3 * * *`, 03:00 UTC) — лимит плана Vercel на частоту cron.
 * В проде после снятия лимита верните в `vercel.json` более частый интервал, например каждые 15 минут:
 * `0,15,30,45 * * * *` (тот же смысл, что стандартный cron с шагом 15 по минутам).
 *
 * Заголовок Authorization: Bearer <CRON_SECRET> (задаётся в Vercel при включённом CRON_SECRET).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/schedule-slot-cleanup] CRON_SECRET не задан");
    return NextResponse.json(
      { message: "Cron не настроен" },
      { status: 503 }
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await withPrismaLock(() => cleanupScheduleSlotsGlobal());
    return NextResponse.json({ ok: true, ...stats });
  } catch (err) {
    console.error("[GET /api/cron/schedule-slot-cleanup]", err);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
