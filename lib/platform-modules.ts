import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

/**
 * Глобальные флаги модулей (админка → /admin/modules).
 *
 * scheduling: записи, слоты, календарь ICS, телеграм-записи, POST/PATCH appointments,
 *   GET/POST /api/schedule/slots, PATCH/DELETE slots/[id], schedule/psychologists(+slots),
 *   вкладка «Записи» в профиле клиента (пропсы с сервера обязательны везде, где ренерится профиль).
 * diagnostics: все /api/diagnostics/*, GET психолога …/diagnostics, админ-тесты, страница /diagnostics/[token].
 *
 * Каталог психологов для клиента (/client/psychologists) не зависит от scheduling; запись на слоты — зависит.
 */
/** Единственная строка настроек инстанса CRM */
export const PLATFORM_SETTINGS_ID = "default";

export type PlatformModuleKey = "scheduling" | "diagnostics";

export type PlatformModuleFlags = {
  scheduling: boolean;
  diagnostics: boolean;
};

const ALL_ENABLED: PlatformModuleFlags = {
  scheduling: true,
  diagnostics: true
};

export async function getPlatformModuleFlags(): Promise<PlatformModuleFlags> {
  try {
    const row = await prisma.platformSettings.findUnique({
      where: { id: PLATFORM_SETTINGS_ID },
      select: { schedulingEnabled: true, diagnosticsEnabled: true }
    });
    if (!row) return ALL_ENABLED;
    return {
      scheduling: row.schedulingEnabled,
      diagnostics: row.diagnosticsEnabled
    };
  } catch {
    // Таблица ещё не применена / ошибка БД — не ломаем приложение
    return ALL_ENABLED;
  }
}

export function moduleForbiddenResponse(): NextResponse {
  return NextResponse.json(
    { message: "Этот раздел временно отключён администратором" },
    { status: 403 }
  );
}

export async function assertModuleEnabled(
  key: PlatformModuleKey
): Promise<NextResponse | null> {
  const flags = await getPlatformModuleFlags();
  if (key === "scheduling" && !flags.scheduling) return moduleForbiddenResponse();
  if (key === "diagnostics" && !flags.diagnostics) return moduleForbiddenResponse();
  return null;
}
