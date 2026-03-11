import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

type ParamsPromise = {
  params: Promise<{
    id: string;
  }>;
};

const valuesSchema = z.record(z.string(), z.unknown().nullable());

export async function GET(_req: Request, { params }: ParamsPromise) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "PSYCHOLOGIST") {
    return NextResponse.json({ message: "Доступ запрещён" }, { status: 403 });
  }
  const userId = (session.user as any).id as string;

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

  const defs = await prisma.customFieldDefinition.findMany({
    where: { psychologistId: psych.id, target: "CLIENT" },
    orderBy: [{ group: "asc" }, { order: "asc" }, { createdAt: "asc" }]
  });

  if (defs.length === 0) {
    return NextResponse.json({ definitions: [], values: {} });
  }

  const values = await prisma.customFieldValue.findMany({
    where: {
      clientId: id,
      definitionId: { in: defs.map((d) => d.id) }
    }
  });

  const map: Record<string, unknown> = {};
  for (const v of values) {
    map[v.definitionId] = v.value;
  }

  return NextResponse.json({
    definitions: defs,
    values: map
  });
}

export async function PATCH(request: Request, { params }: ParamsPromise) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "PSYCHOLOGIST") {
      return NextResponse.json({ message: "Доступ запрещён" }, { status: 403 });
    }
    const userId = (session.user as any).id as string;

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

    const body = await request.json().catch(() => ({}));
    const parsed = valuesSchema.parse(body?.values ?? {});

    const defs = await prisma.customFieldDefinition.findMany({
      where: { psychologistId: psych.id, target: "CLIENT" }
    });
    const allowedIds = new Set(defs.map((d) => d.id));

    const ops = [];
    for (const [definitionId, raw] of Object.entries(parsed)) {
      if (!allowedIds.has(definitionId)) continue;
      if (raw === null || raw === undefined || raw === "") {
        ops.push(
          prisma.customFieldValue.deleteMany({
            where: { clientId: id, definitionId }
          })
        );
      } else {
        ops.push(
          prisma.customFieldValue.upsert({
            where: {
              definitionId_clientId: {
                definitionId,
                clientId: id
              }
            },
            create: {
              definitionId,
              clientId: id,
              value: raw as any
            },
            update: {
              value: raw as any
            }
          })
        );
      }
    }

    if (ops.length > 0) {
      await prisma.$transaction(ops);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Ошибка валидации", issues: error.issues },
        { status: 400 }
      );
    }
    console.error("[PATCH /api/psychologist/clients/[id]/custom-fields]", error);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

