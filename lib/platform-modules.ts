import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

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
