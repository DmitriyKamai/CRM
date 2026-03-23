import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

type LogAuditParams = {
  action: string;
  actorUserId?: string | null;
  actorRole?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  ip?: string | null;
  meta?: Record<string, unknown> | null;
};

/**
 * Запись в AuditLog (best-effort: ошибка не прерывает основной сценарий).
 */
export async function safeLogAudit(params: LogAuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        actorUserId: params.actorUserId ?? null,
        actorRole: params.actorRole ?? null,
        targetType: params.targetType ?? null,
        targetId: params.targetId ?? null,
        ip: params.ip ?? null,
        meta: params.meta == null ? undefined : (params.meta as Prisma.InputJsonValue)
      }
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[audit-log] failed:", err);
    }
  }
}

