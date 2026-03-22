import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getSpreadsheetIdFromProfileSettings,
  isGoogleSheetsConfigured,
  parseSpreadsheetId,
  readSpreadsheetAsAoA
} from "@/lib/google-sheets";
import { prisma } from "@/lib/db";
import { requirePsychologist } from "@/lib/security/api-guards";

const bodySchema = z.object({
  spreadsheetUrlOrId: z.string().optional().nullable(),
  sheetTitle: z.string().optional().nullable()
});

/**
 * Читает первый лист Google Таблицы (или указанный лист) и возвращает строки для
 * сопоставления полей — как при импорте из CSV/XLSX.
 */
export async function POST(request: Request) {
  try {
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;

    if (!isGoogleSheetsConfigured()) {
      return NextResponse.json(
        {
          message:
            "Импорт из Google Таблиц не настроен: на сервере не задан ключ сервисного аккаунта (GOOGLE_SERVICE_ACCOUNT_JSON и т.д.)."
        },
        { status: 503 }
      );
    }

    const json = await request.json().catch(() => null);
    const body = bodySchema.parse(json ?? {});

    let spreadsheetId: string | null = null;
    if (typeof body.spreadsheetUrlOrId === "string" && body.spreadsheetUrlOrId.trim()) {
      spreadsheetId = parseSpreadsheetId(body.spreadsheetUrlOrId.trim());
      if (!spreadsheetId) {
        return NextResponse.json(
          { message: "Укажите ссылку на Google Таблицу или ID таблицы из URL" },
          { status: 400 }
        );
      }
    } else {
      const profile = await prisma.psychologistProfile.findUnique({
        where: { id: ctx.psychologistId },
        select: { settingsJson: true }
      });
      spreadsheetId = getSpreadsheetIdFromProfileSettings(profile?.settingsJson);
    }

    if (!spreadsheetId) {
      return NextResponse.json(
        {
          message:
            "Не указана таблица: вставьте ссылку на Google Таблицу в форму импорта (или сохраните её через API профиля)."
        },
        { status: 400 }
      );
    }

    const { sheetTitle, values } = await readSpreadsheetAsAoA(
      spreadsheetId,
      body.sheetTitle ?? undefined
    );

    if (values.length === 0) {
      return NextResponse.json({ message: "На листе нет данных" }, { status: 400 });
    }

    const headers = (values[0] ?? []).map((h) => {
      if (h == null || h === "") return "";
      return String(h).trim();
    });
    const rows = values.slice(1) as (string | number | boolean)[][];

    return NextResponse.json({
      spreadsheetId,
      sheetTitle,
      headers,
      rows
    });
  } catch (err) {
    console.error("[POST /api/psychologist/clients/import/google-sheets]", err);
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("403") ||
      msg.includes("PERMISSION_DENIED") ||
      msg.toLowerCase().includes("permission")
    ) {
      return NextResponse.json(
        {
          message:
            "Нет доступа к таблице. В Google Таблицах: Доступ → добавьте email из поля client_email в JSON ключа (права «Читатель» или «Редактор»)."
        },
        { status: 403 }
      );
    }
    if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
      return NextResponse.json(
        { message: "Таблица не найдена или нет доступа" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { message: msg || "Не удалось прочитать таблицу" },
      { status: 500 }
    );
  }
}
