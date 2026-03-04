import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { withPrismaLock } from "@/lib/prisma-request-lock";

type ParamsPromise = {
  params: Promise<{ id: string }>;
};

// Свободные слоты конкретного психолога (для записи клиента)
export async function GET(_request: Request, { params }: ParamsPromise) {
  try {
    return await withPrismaLock(async () => {
      const { id: psychologistId } = await params;
      const now = new Date();

      const slots = await prisma.scheduleSlot.findMany({
        where: {
          psychologistId,
          status: "FREE",
          start: {
            gte: now
          }
        },
        orderBy: { start: "asc" }
      });

      const slotIds = slots.map((s) => s.id);
      if (slotIds.length > 0) {
        // Снимаем привязку только у отменённых/завершённых записей, чтобы не трогать активные и избежать P2002 при повторной записи
        await prisma.appointment.updateMany({
          where: {
            slotId: { in: slotIds },
            status: { notIn: ["SCHEDULED", "PENDING_CONFIRMATION"] }
          },
          data: { slotId: null }
        });
      }

      return NextResponse.json(slots);
    });
  } catch (err) {
    console.error("[API GET /api/schedule/psychologists/[id]/slots]", err);
    return NextResponse.json(
      { message: "Не удалось загрузить слоты" },
      { status: 500 }
    );
  }
}

