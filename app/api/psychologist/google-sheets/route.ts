import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import {
  getGoogleSheetsCredentialsStatus,
  getSpreadsheetIdFromProfileSettings,
  isGoogleSheetsConfigured,
  parseSpreadsheetId
} from "@/lib/google-sheets";
import { requirePsychologist } from "@/lib/security/api-guards";

/** Статус ключа API и сохранённая таблица для импорта (подстановка ссылки). */
export async function GET() {
  try {
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;

    const p = await prisma.psychologistProfile.findUnique({
      where: { id: ctx.psychologistId },
      select: { settingsJson: true }
    });

    const credentialsStatus = getGoogleSheetsCredentialsStatus();
    return NextResponse.json({
      serverConfigured: isGoogleSheetsConfigured(),
      credentialsStatus,
      spreadsheetId: getSpreadsheetIdFromProfileSettings(p?.settingsJson)
    });
  } catch (err) {
    console.error("[GET /api/psychologist/google-sheets]", err);
    return NextResponse.json({ message: "Ошибка сервера" }, { status: 500 });
  }
}

/** Сохранить ссылку или ID таблицы (или очистить). */
export async function PATCH(request: Request) {
  try {
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;

    let body: { spreadsheetId?: string | null };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Неверный JSON" }, { status: 400 });
    }

    const p = await prisma.psychologistProfile.findUnique({
      where: { id: ctx.psychologistId },
      select: { settingsJson: true }
    });

    const cur =
      p?.settingsJson &&
      typeof p.settingsJson === "object" &&
      !Array.isArray(p.settingsJson)
        ? { ...(p.settingsJson as Record<string, unknown>) }
        : {};

    if (body.spreadsheetId === null || body.spreadsheetId === "") {
      const next = { ...cur, googleSheets: { ...((cur.googleSheets as object) ?? {}), spreadsheetId: null } };
      await prisma.psychologistProfile.update({
        where: { id: ctx.psychologistId },
        data: { settingsJson: next }
      });
      return NextResponse.json({ ok: true, spreadsheetId: null });
    }

    if (typeof body.spreadsheetId !== "string") {
      return NextResponse.json({ message: "Ожидается spreadsheetId" }, { status: 400 });
    }

    const parsed = parseSpreadsheetId(body.spreadsheetId);
    if (!parsed) {
      return NextResponse.json(
        {
          message:
            "Вставьте ссылку на Google Таблицу (из адресной строки) или ID таблицы из URL между /d/ и /edit"
        },
        { status: 400 }
      );
    }

    const next = {
      ...cur,
      googleSheets: {
        ...((typeof cur.googleSheets === "object" && cur.googleSheets && !Array.isArray(cur.googleSheets)
          ? cur.googleSheets
          : {}) as Record<string, unknown>),
        spreadsheetId: parsed
      }
    };

    await prisma.psychologistProfile.update({
      where: { id: ctx.psychologistId },
      data: { settingsJson: next }
    });

    return NextResponse.json({ ok: true, spreadsheetId: parsed });
  } catch (err) {
    console.error("[PATCH /api/psychologist/google-sheets]", err);
    return NextResponse.json({ message: "Ошибка сервера" }, { status: 500 });
  }
}
