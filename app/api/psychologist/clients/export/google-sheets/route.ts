import { NextResponse } from "next/server";
import { z } from "zod";

import { safeLogAudit } from "@/lib/audit-log";
import { buildClientsExportTable } from "@/lib/clients-export-build";
import { prisma } from "@/lib/db";
import { createSpreadsheetWithAoA } from "@/lib/google-sheets";
import { getClientIp, requirePsychologist } from "@/lib/security/api-guards";

const BodySchema = z.object({
  statusId: z.string().optional().nullable(),
  /** Необязательное имя нового файла (до 200 символов). */
  fileTitle: z.string().max(200).optional().nullable()
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
    const { statusId, fileTitle } = parsed.data;

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

    const statusFilter =
      typeof statusId === "string" && statusId.trim() && statusId.trim() !== "ALL"
        ? statusId.trim()
        : undefined;

    const { headers, rows, exportedCount } = await buildClientsExportTable(
      ctx.psychologistId,
      statusFilter ?? null
    );

    const aoA: string[][] = [headers, ...rows];

    const now = new Date();
    const dateRu = now.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
    const defaultTitle = `Клиенты CRM — ${dateRu}`;
    const docTitle =
      typeof fileTitle === "string" && fileTitle.trim().length > 0
        ? fileTitle.trim()
        : defaultTitle;

    let result: { spreadsheetId: string; sheetTitle: string; spreadsheetUrl: string };
    try {
      result = await createSpreadsheetWithAoA(docTitle, aoA, refreshToken);
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
        format: "google_sheets_new_file",
        statusId: statusFilter ?? null,
        exportedCount,
        spreadsheetId: result.spreadsheetId
      }
    });

    return NextResponse.json({
      ok: true,
      exportedCount,
      fileTitle: docTitle,
      sheetTitle: result.sheetTitle,
      spreadsheetUrl: result.spreadsheetUrl,
      spreadsheetId: result.spreadsheetId
    });
  } catch (err) {
    console.error("[POST /api/psychologist/clients/export/google-sheets]", err);
    return NextResponse.json({ message: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
