import { NextResponse } from "next/server";

import { assertModuleEnabled } from "@/lib/platform-modules";
import { withPrismaLock } from "@/lib/prisma-request-lock";
import { cleanupScheduleSlotsForPsychologist } from "@/lib/schedule-slot-cleanup";
import { requirePsychologist } from "@/lib/security/api-guards";

/** Явная очистка слотов текущего психолога (без сайд-эффектов в GET). */
export async function POST() {
  try {
    return await withPrismaLock(async () => {
      const mod = await assertModuleEnabled("scheduling");
      if (mod) return mod;
      const ctx = await requirePsychologist();
      if (!ctx.ok) return ctx.response;

      const stats = await cleanupScheduleSlotsForPsychologist(ctx.psychologistId);
      return NextResponse.json({ ok: true, ...stats });
    });
  } catch (err) {
    console.error("[POST /api/schedule/slots/cleanup]", err);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
