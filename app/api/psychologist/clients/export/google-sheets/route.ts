import { NextResponse } from "next/server";

import { safeLogAudit } from "@/lib/audit-log";
import { buildClientsExportTable } from "@/lib/clients-export-build";
import { prisma } from "@/lib/db";
import {
  CLIENTS_SHEET_TITLE,
  getSpreadsheetIdFromProfileSettings,
  isGoogleSheetsConfigured,
  writeClientsTableToSpreadsheet
} from "@/lib/google-sheets-export";
import { getClientIp, requirePsychologist } from "@/lib/security/api-guards";

/**
 * Выгрузка клиентов в Google Таблицу (лист перезаписывается).
 * Тело: { statusId?: string } — тот же фильтр, что у CSV.
 */
export async function POST(request: Request) {
  try {
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;
    const ip = getClientIp(request);

    if (!isGoogleSheetsConfigured()) {
      return NextResponse.json(
        {
          message:
            "Экспорт в Google Таблицы не настроен: на сервере не задан GOOGLE_SERVICE_ACCOUNT_JSON. Обратитесь к администратору."
        },
        { status: 503 }
      );
    }

    let statusId: string | undefined;
    try {
      const body = (await request.json().catch(() => ({}))) as {
        statusId?: string;
      };
      if (typeof body.statusId === "string" && body.statusId.trim()) {
        statusId = body.statusId.trim();
      }
    } catch {
      /* empty body */
    }

    const profile = await prisma.psychologistProfile.findUnique({
      where: { id: ctx.psychologistId },
      select: { settingsJson: true }
    });

    const spreadsheetId = getSpreadsheetIdFromProfileSettings(profile?.settingsJson);
    if (!spreadsheetId) {
      return NextResponse.json(
        {
          message:
            "Не указана Google Таблица. В списке клиентов откройте настройки экспорта и вставьте ссылку на таблицу, затем выдайте доступ сервисному аккаунту (см. документацию в коде)."
        },
        { status: 400 }
      );
    }

    const { headers, rows, exportedCount } = await buildClientsExportTable(
      ctx.psychologistId,
      statusId ?? null
    );

    await writeClientsTableToSpreadsheet(spreadsheetId, headers, rows);

    await safeLogAudit({
      action: "CLIENTS_EXPORT",
      actorUserId: ctx.userId,
      actorRole: ctx.user.role ?? "PSYCHOLOGIST",
      targetType: "PsychologistProfile",
      targetId: ctx.psychologistId,
      ip,
      meta: {
        format: "google_sheets",
        statusId: statusId ?? null,
        exportedCount,
        sheetTitle: CLIENTS_SHEET_TITLE
      }
    });

    return NextResponse.json({
      ok: true,
      exportedCount,
      sheetTitle: CLIENTS_SHEET_TITLE,
      message: `Данные записаны на лист «${CLIENTS_SHEET_TITLE}».`
    });
  } catch (err) {
    console.error("[POST /api/psychologist/clients/export/google-sheets]", err);
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("403") ||
      msg.includes("permission") ||
      msg.includes("PERMISSION_DENIED")
    ) {
      return NextResponse.json(
        {
          message:
            "Нет доступа к таблице. Откройте таблицу в Google → Доступ → добавьте email сервисного аккаунта из Google Cloud с правом «Редактор»."
        },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { message: msg || "Не удалось выгрузить в Google Таблицы" },
      { status: 500 }
    );
  }
}
