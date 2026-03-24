import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  getClientsTableColumnOrderFromSettings,
  mergeClientsTableColumnOrder
} from "@/lib/psychologist-settings";
import { requirePsychologist } from "@/lib/security/api-guards";

const MAX_ORDER_LEN = 80;

function validateColumnOrder(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length > MAX_ORDER_LEN) return null;
  const out: string[] = [];
  for (const id of raw) {
    if (typeof id !== "string" || id.length === 0 || id.length > 256) return null;
    out.push(id);
  }
  return out;
}

/** Сохранённый порядок колонок таблицы клиентов (`settingsJson.clientsTable.columnOrder`). */
export async function GET() {
  try {
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;

    const p = await prisma.psychologistProfile.findUnique({
      where: { id: ctx.psychologistId },
      select: { settingsJson: true }
    });

    const columnOrder = getClientsTableColumnOrderFromSettings(p?.settingsJson);

    return NextResponse.json({ columnOrder });
  } catch (err) {
    console.error("[GET /api/psychologist/clients-table-settings]", err);
    return NextResponse.json({ message: "Ошибка сервера" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Неверный JSON" }, { status: 400 });
    }

    const co = validateColumnOrder(
      body && typeof body === "object" && body !== null && "columnOrder" in body
        ? (body as { columnOrder: unknown }).columnOrder
        : undefined
    );
    if (co === null) {
      return NextResponse.json(
        { message: "Ожидается columnOrder: массив непустых строк (до 80 элементов)" },
        { status: 400 }
      );
    }

    const p = await prisma.psychologistProfile.findUnique({
      where: { id: ctx.psychologistId },
      select: { settingsJson: true }
    });

    const next = mergeClientsTableColumnOrder(p?.settingsJson, co);

    await prisma.psychologistProfile.update({
      where: { id: ctx.psychologistId },
      data: { settingsJson: next as Prisma.InputJsonValue }
    });

    return NextResponse.json({ ok: true, columnOrder: co });
  } catch (err) {
    console.error("[PATCH /api/psychologist/clients-table-settings]", err);
    return NextResponse.json({ message: "Ошибка сервера" }, { status: 500 });
  }
}
