import { AppointmentStatus } from "@prisma/client";

import { prisma } from "@/lib/db";

export type ScheduleSlotCleanupStats = {
  unstuckCount: number;
  deletedPastFreeCount: number;
};

const ACTIVE_APPOINTMENT: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.PENDING_CONFIRMATION
];

/**
 * Очистка слотов одного психолога (как раньше в GET /api/schedule/slots):
 * застрявшие BOOKED → FREE, прошедшие пустые FREE в окне последних суток по start — удаление.
 */
export async function cleanupScheduleSlotsForPsychologist(
  psychologistId: string
): Promise<ScheduleSlotCleanupStats> {
  const now = new Date();
  const slots = await prisma.scheduleSlot.findMany({
    where: {
      psychologistId,
      start: {
        gte: new Date(now.getTime() - 1000 * 60 * 60 * 24)
      }
    },
    include: {
      appointment: true
    }
  });

  const stuckSlotIds = slots
    .filter(
      s =>
        s.status === "BOOKED" &&
        (!s.appointment ||
          !ACTIVE_APPOINTMENT.includes(s.appointment.status))
    )
    .map(s => s.id);

  if (stuckSlotIds.length > 0) {
    await prisma.appointment.updateMany({
      where: { slotId: { in: stuckSlotIds } },
      data: { slotId: null }
    });
    await prisma.scheduleSlot.updateMany({
      where: { id: { in: stuckSlotIds } },
      data: { status: "FREE" }
    });
  }

  const pastFreeSlotIds = slots
    .filter(
      s =>
        s.end < now &&
        (stuckSlotIds.includes(s.id) || s.status === "FREE") &&
        !s.appointment
    )
    .map(s => s.id);

  if (pastFreeSlotIds.length > 0) {
    await prisma.scheduleSlot.deleteMany({
      where: { id: { in: pastFreeSlotIds } }
    });
  }

  return {
    unstuckCount: stuckSlotIds.length,
    deletedPastFreeCount: pastFreeSlotIds.length
  };
}

/**
 * Глобальная очистка для крона: все застрявшие BOOKED и все прошедшие пустые FREE.
 */
export async function cleanupScheduleSlotsGlobal(): Promise<ScheduleSlotCleanupStats> {
  const now = new Date();

  const stuckSlots = await prisma.scheduleSlot.findMany({
    where: {
      status: "BOOKED",
      OR: [
        { appointment: null },
        {
          appointment: {
            status: { notIn: ACTIVE_APPOINTMENT }
          }
        }
      ]
    },
    select: { id: true }
  });
  const stuckSlotIds = stuckSlots.map(s => s.id);

  if (stuckSlotIds.length > 0) {
    await prisma.appointment.updateMany({
      where: { slotId: { in: stuckSlotIds } },
      data: { slotId: null }
    });
    await prisma.scheduleSlot.updateMany({
      where: { id: { in: stuckSlotIds } },
      data: { status: "FREE" }
    });
  }

  const deletedPast = await prisma.scheduleSlot.deleteMany({
    where: {
      end: { lt: now },
      status: "FREE",
      appointment: null
    }
  });

  return {
    unstuckCount: stuckSlotIds.length,
    deletedPastFreeCount: deletedPast.count
  };
}
