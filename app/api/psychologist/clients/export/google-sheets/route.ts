import { NextResponse } from "next/server";
import { z } from "zod";

import { safeLogAudit } from "@/lib/audit-log";
import { buildClientsExportTable } from "@/lib/clients-export-build";
import { prisma } from "@/lib/db";
import {
  getSpreadsheetIdFromProfileSettings,
  parseSpreadsheetId,
  writeSpreadsheetAoA
} from "@/lib/google-sheets";
import { getClientIp, requirePsychologist } from "@/lib/security/api-guards";

const BodySchema = z.object({
  statusId: z.string().optional().nullable(),
  spreadsheetUrlOrId: z.string().optional().nullable(),
  sheetTitle: z.string().optional().nullable()
});

function googleErrorMessage(err: unknown): string {
  const e = err as { message?: string; code?: number; response?: { data?: { error?: { message?: string } } } };
  const msg =
    e?.response?.data?.error?.message ||
    (typeof e?.message === "string" ? e.message : "") ||
    "";
  if (/insufficient|permission|403|PERMISSION_DENIED/i.test(msg)) {
    return "Google отклонил запись: проверьте права на таблицу и что при подключении выдан доступ на изменение таблиц. При необходимости отключите Google в импорте и подключите снова.";
  }
  return msg || "Не удалось записать в Google Таблицу";
}

/** POST — выгрузка списка клиентов в Google Таблицу (OAuth пользователя, без сервисного аккаунта). */
export async function POST(request: Request) {
  try {
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;
    const ip = getClientIp(request);

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      json = {};
    }
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: "Неверные параметры запроса" }, { status: 400 });
    }
    const { statusId, spreadsheetUrlOrId, sheetTitle } = parsed.data;

    const profile = await prisma.psychologistProfile.findUnique({
      where: { id: ctx.psychologistId },
      select: { settingsJson: true, googleSheetsRefreshToken: true }
    });

    const refreshToken = profile?.googleSheetsRefreshToken?.trim();
    if (!refreshToken) {
      return NextResponse.json(
        { message: "Сначала подключите Google в разделе импорта (кнопка «Подключить Google»)." },
        { status: 403 }
      );
    }

    let spreadsheetId: string | null = null;
    if (typeof spreadsheetUrlOrId === "string" && spreadsheetUrlOrId.trim()) {
      spreadsheetId = parseSpreadsheetId(spreadsheetUrlOrId.trim());
    }
    if (!spreadsheetId) {
      spreadsheetId = getSpreadsheetIdFromProfileSettings(profile?.settingsJson);
    }
    if (!spreadsheetId) {
      return NextResponse.json(
        {
          message:
            "Не выбрана таблица: укажите ссылку в блоке «Google Таблицы» при импорте или выберите файл через «Выбрать таблицу…»."
        },
        { status: 400 }
      );
    }

    const statusFilter =
      typeof statusId === "string" && statusId.trim() && statusId.trim() !== "ALL"
        ? statusId.trim()
        : undefined;

    const { headers, rows, exportedCount } = await buildClientsExportTable(
      ctx.psychologistId,
      statusFilter ?? null
    );

    const aoA: string[][] = [headers, ...rows];

    let result: { sheetTitle: string; spreadsheetUrl: string };
    try {
      result = await writeSpreadsheetAoA(
        spreadsheetId,
        sheetTitle?.trim() || null,
        aoA,
        refreshToken
      );
    } catch (err) {
      console.error("[POST /api/psychologist/clients/export/google-sheets]", err);
      return NextResponse.json({ message: googleErrorMessage(err) }, { status: 502 });
    }

    await safeLogAudit({
      action: "CLIENTS_EXPORT",
      actorUserId: ctx.userId,
      actorRole: ctx.user.role ?? "PSYCHOLOGIST",
      targetType: "PsychologistProfile",
      targetId: ctx.psychologistId,
      ip,
      meta: {
        format: "google_sheets",
        statusId: statusFilter ?? null,
        exportedCount,
        spreadsheetId
      }
    });

    return NextResponse.json({
      ok: true,
      exportedCount,
      sheetTitle: result.sheetTitle,
      spreadsheetUrl: result.spreadsheetUrl
    });
  } catch (err) {
    console.error("[POST /api/psychologist/clients/export/google-sheets]", err);
    return NextResponse.json({ message: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
