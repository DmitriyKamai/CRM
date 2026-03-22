import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

/** Типы событий ленты «История» (хранятся в БД как строки). */
export const ClientHistoryType = {
  CLIENT_CREATED: "CLIENT_CREATED",
  PROFILE_UPDATED: "PROFILE_UPDATED",
  STATUS_CHANGED: "STATUS_CHANGED",
  REMOVED_FROM_LIST: "REMOVED_FROM_LIST",
  CUSTOM_FIELDS_UPDATED: "CUSTOM_FIELDS_UPDATED",
  DIAGNOSTIC_LINK_CREATED: "DIAGNOSTIC_LINK_CREATED",
  DIAGNOSTIC_COMPLETED: "DIAGNOSTIC_COMPLETED",
  APPOINTMENT_STATUS_CHANGED: "APPOINTMENT_STATUS_CHANGED",
  FILE_UPLOADED: "FILE_UPLOADED",
  FILE_DELETED: "FILE_DELETED"
} as const;

export type ClientHistoryTypeValue = (typeof ClientHistoryType)[keyof typeof ClientHistoryType];

type LogClientHistoryParams = {
  clientId: string;
  type: ClientHistoryTypeValue;
  actorUserId?: string | null;
  meta?: Record<string, unknown> | null;
};

/**
 * Запись в ClientHistoryEvent (best-effort, как AuditLog).
 */
export async function safeLogClientHistory(params: LogClientHistoryParams): Promise<void> {
  try {
    await prisma.clientHistoryEvent.create({
      data: {
        clientId: params.clientId,
        type: params.type,
        actorUserId: params.actorUserId ?? null,
        meta:
          params.meta == null
            ? undefined
            : (params.meta as Prisma.InputJsonValue)
      }
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[client-history] failed:", err);
    }
  }
}
