import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { assertModuleEnabled } from "@/lib/platform-modules";
import { requireClientOrPsychologist } from "@/lib/security/api-guards";

// GET /api/client/appointments?filter=past|upcoming|all
export async function GET(request: Request) {
  const ctx = await requireClientOrPsychologist();
  if (!ctx.ok) return ctx.response;
  const mod = await assertModuleEnabled("scheduling");
  if (mod) return mod;

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") ?? "all";

  const clients = await prisma.clientProfile.findMany({
    where: { userId: ctx.userId },
    select: { id: true }
  });

  const clientIds = clients.map(c => c.id);
  if (clientIds.length === 0) {
    return NextResponse.json([]);
  }

  const now = new Date();
  const where: Prisma.AppointmentWhereInput = {
    clientId: { in: clientIds }
  };

  if (filter === "past") {
    where.end = { lt: now };
    where.status = { notIn: ["PENDING_CONFIRMATION", "CANCELED"] };
  } else if (filter === "upcoming") {
    where.start = { gte: now };
    where.status = { in: ["SCHEDULED", "PENDING_CONFIRMATION"] };
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      psychologist: { select: { firstName: true, lastName: true } }
    },
    orderBy: { start: "desc" },
    take: 50
  });

  return NextResponse.json(
    appointments.map(a => ({
      id: a.id,
      start: a.start.toISOString(),
      end: a.end.toISOString(),
      status: a.status,
      psychologistName:
        `${a.psychologist.lastName} ${a.psychologist.firstName}`.trim() ||
        "Психолог",
      proposedByPsychologist: a.proposedByPsychologist
    }))
  );
}
