import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { assertModuleEnabled } from "@/lib/platform-modules";
import { requirePsychologist } from "@/lib/security/api-guards";

type ParamsPromise = {
  params: Promise<{ id: string }>;
};

/** Результаты диагностики по клиенту (для вкладки в профиле). */
export async function GET(_req: Request, { params }: ParamsPromise) {
  const { id: clientId } = await params;
  const ctx = await requirePsychologist();
  if (!ctx.ok) return ctx.response;
  const mod = await assertModuleEnabled("diagnostics");
  if (mod) return mod;

  const client = await prisma.clientProfile.findFirst({
    where: {
      id: clientId,
      psychologistId: ctx.psychologistId
    },
    select: { id: true }
  });

  if (!client) {
    return NextResponse.json({ message: "Клиент не найден" }, { status: 404 });
  }

  const testResults = await prisma.testResult.findMany({
    where: {
      clientId: client.id,
      OR: [
        { psychologistId: ctx.psychologistId },
        { psychologistId: null }
      ]
    },
    include: {
      test: { select: { title: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  const diagnostics = testResults.map((r) => ({
    id: r.id,
    testTitle: r.test?.title ?? "Диагностика",
    createdAt: r.createdAt.toISOString(),
    interpretation: r.interpretation ?? null
  }));

  return NextResponse.json({ diagnostics });
}
