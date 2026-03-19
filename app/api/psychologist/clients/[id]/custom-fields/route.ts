import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logZodError } from "@/lib/log-validation-error";
import { requirePsychologist } from "@/lib/security/api-guards";

type ParamsPromise = {
  params: Promise<{
    id: string;
  }>;
};

const valuesSchema = z.record(z.string(), z.unknown().nullable());

export async function GET(_req: Request, { params }: ParamsPromise) {
  const { id } = await params;
  const ctx = await requirePsychologist();
  if (!ctx.ok) return ctx.response;

  const defs = await prisma.customFieldDefinition.findMany({
    where: { psychologistId: ctx.psychologistId, target: "CLIENT" },
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
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;

    const body = await request.json().catch(() => ({}));
    const parsed = valuesSchema.parse(body?.values ?? {});

    const defs = await prisma.customFieldDefinition.findMany({
      where: { psychologistId: ctx.psychologistId, target: "CLIENT" }
    });
    const allowedIds = new Set(defs.map((d) => d.id));

    for (const [definitionId, raw] of Object.entries(parsed)) {
      if (!allowedIds.has(definitionId)) continue;

      // пустое значение — просто удаляем все значения для этого поля/клиента
      if (raw === null || raw === undefined || raw === "") {
        await prisma.customFieldValue.deleteMany({
          where: { clientId: id, definitionId }
        });
        continue;
      }

      const existing = await prisma.customFieldValue.findFirst({
        where: { clientId: id, definitionId }
      });

      if (!existing) {
        await prisma.customFieldValue.create({
          data: {
            definitionId,
            clientId: id,
            value: raw as Prisma.InputJsonValue
          }
        });
      } else {
        await prisma.customFieldValue.update({
          where: { id: existing.id },
          data: { value: raw as Prisma.InputJsonValue }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logZodError("PATCH /api/psychologist/clients/[id]/custom-fields", error);
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

