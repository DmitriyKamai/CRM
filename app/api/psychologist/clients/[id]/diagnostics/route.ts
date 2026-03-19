import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

type ParamsPromise = {
  params: Promise<{ id: string }>;
};

/** Результаты диагностики по клиенту (для вкладки в профиле). */
export async function GET(_req: Request, { params }: ParamsPromise) {
  const { id: clientId } = await params;
  const session = await getServerSession(authOptions);

  const role = (session?.user as unknown as { role?: string | null } | null)?.role;
  if (!session?.user || role !== "PSYCHOLOGIST") {
    return NextResponse.json({ message: "Доступ запрещён" }, { status: 403 });
  }

  const userId = (session.user as unknown as { id?: string | null }).id;
  if (!userId) {
    return NextResponse.json({ message: "Сессия недействительна" }, { status: 401 });
  }
  const psych = await prisma.psychologistProfile.findUnique({
    where: { userId },
    select: { id: true }
  });

  if (!psych) {
    return NextResponse.json(
      { message: "Профиль психолога не найден" },
      { status: 400 }
    );
  }

  const client = await prisma.clientProfile.findFirst({
    where: {
      id: clientId,
      psychologistId: psych.id
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
        { psychologistId: psych.id },
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
