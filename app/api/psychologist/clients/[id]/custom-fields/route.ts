import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { safeLogAudit } from "@/lib/audit-log";
import { ClientHistoryType, safeLogClientHistory } from "@/lib/client-history";
import {
  formatCustomFieldValueForHistory,
  jsonValueEqual
} from "@/lib/custom-field-history-format";
import { prisma } from "@/lib/db";
import { logZodError } from "@/lib/log-validation-error";
import { getClientIp, requirePsychologist } from "@/lib/security/api-guards";

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

    const owned = await prisma.clientProfile.findFirst({
      where: { id, psychologistId: ctx.psychologistId },
      select: { id: true }
    });
    if (!owned) {
      return NextResponse.json({ message: "Клиент не найден" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = valuesSchema.parse(body?.values ?? {});

    const defs = await prisma.customFieldDefinition.findMany({
      where: { psychologistId: ctx.psychologistId, target: "CLIENT" }
    });
    const allowedIds = new Set(defs.map((d) => d.id));
    const defById = new Map(defs.map((d) => [d.id, d]));

    const existingRows = await prisma.customFieldValue.findMany({
      where: {
        clientId: id,
        definitionId: { in: Array.from(allowedIds) }
      }
    });
    const existingByDef = new Map<string, Prisma.JsonValue>();
    for (const row of existingRows) {
      existingByDef.set(row.definitionId, row.value);
    }
    const snapshot = new Map(existingByDef);

    const changes: { label: string; from: string; to: string }[] = [];

    for (const [definitionId, raw] of Object.entries(parsed)) {
      if (!allowedIds.has(definitionId)) continue;
      const def = defById.get(definitionId);
      if (!def) continue;

      const oldVal = snapshot.has(definitionId) ? snapshot.get(definitionId) : undefined;
      const empty = raw === null || raw === undefined || raw === "";

      if (empty) {
        if (!existingByDef.has(definitionId)) continue;
        await prisma.customFieldValue.deleteMany({
          where: { clientId: id, definitionId }
        });
        existingByDef.delete(definitionId);
        changes.push({
          label: def.label,
          from: formatCustomFieldValueForHistory(oldVal, def),
          to: "—"
        });
        continue;
      }

      if (jsonValueEqual(oldVal, raw)) {
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
      existingByDef.set(definitionId, raw as unknown as Prisma.JsonValue);

      changes.push({
        label: def.label,
        from: snapshot.has(definitionId)
          ? formatCustomFieldValueForHistory(oldVal, def)
          : "—",
        to: formatCustomFieldValueForHistory(raw, def)
      });
    }

    if (changes.length > 0) {
      await safeLogAudit({
        action: "CLIENT_CUSTOM_FIELDS_BULK_UPDATE",
        actorUserId: ctx.userId,
        actorRole: ctx.user.role ?? "PSYCHOLOGIST",
        targetType: "ClientProfile",
        targetId: id,
        ip: getClientIp(request),
        meta: { fieldCount: changes.length, labels: changes.map((c) => c.label) }
      });
      await safeLogClientHistory({
        clientId: id,
        type: ClientHistoryType.CUSTOM_FIELDS_UPDATED,
        actorUserId: ctx.userId,
        meta: {
          changes: changes.map((c) => ({
            label: c.label,
            from: c.from,
            to: c.to
          }))
        }
      });
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

