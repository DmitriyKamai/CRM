import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { assertModuleEnabled } from "@/lib/platform-modules";

type ParamsPromise = {
  params: Promise<{ id: string }>;
};

// Свободные слоты конкретного психолога (для записи клиента)
export async function GET(_request: Request, { params }: ParamsPromise) {
  try {
    const mod = await assertModuleEnabled("scheduling");
    if (mod) return mod;
    const { id: psychologistId } = await params;
    const now = new Date();

    const slots = await prisma.scheduleSlot.findMany({
      where: {
        psychologistId,
        status: "FREE",
        start: { gte: now }
      },
      orderBy: { start: "asc" }
    });

    const slotIds = slots.map((s) => s.id);
    if (slotIds.length > 0) {
      await prisma.appointment.updateMany({
        where: {
          slotId: { in: slotIds },
          status: { notIn: ["SCHEDULED", "PENDING_CONFIRMATION"] }
        },
        data: { slotId: null }
      });
    }

    return NextResponse.json(slots);
  } catch (err) {
    console.error("[API GET /api/schedule/psychologists/[id]/slots]", err);
    return NextResponse.json(
      { message: "Не удалось загрузить слоты" },
      { status: 500 }
    );
  }
}

