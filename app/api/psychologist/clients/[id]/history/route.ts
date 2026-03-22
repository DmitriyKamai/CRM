import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requirePsychologist } from "@/lib/security/api-guards";

type ParamsPromise = {
  params: Promise<{ id: string }>;
};

const PAGE_SIZE = 80;

export async function GET(_req: Request, { params }: ParamsPromise) {
  const { id } = await params;
  const ctx = await requirePsychologist();
  if (!ctx.ok) return ctx.response;

  const owned = await prisma.clientProfile.findFirst({
    where: { id, psychologistId: ctx.psychologistId },
    select: { id: true }
  });
  if (!owned) {
    return NextResponse.json({ message: "Клиент не найден" }, { status: 404 });
  }

  const events = await prisma.clientHistoryEvent.findMany({
    where: { clientId: id },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    select: {
      id: true,
      createdAt: true,
      type: true,
      meta: true,
      actor: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      createdAt: e.createdAt.toISOString(),
      type: e.type,
      meta: e.meta,
      actorName: e.actor?.name ?? null,
      actorEmail: e.actor?.email ?? null
    }))
  });
}
