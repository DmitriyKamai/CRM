import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

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
 * Запись в AuditLog.
 * Делается как best-effort: если модель ещё не применена в БД или упал prisma generate,
 * основной сценарий не должен ломаться.
 */
export async function safeLogAudit(params: LogAuditParams): Promise<void> {
  try {
    const audit = prisma as unknown as {
      auditLog?: {
        create: (args: { data: unknown }) => Promise<unknown>;
      };
    };

    if (audit.auditLog?.create) {
      await audit.auditLog.create({
        data: {
          action: params.action,
          actorUserId: params.actorUserId ?? null,
          actorRole: params.actorRole ?? null,
          targetType: params.targetType ?? null,
          targetId: params.targetId ?? null,
          ip: params.ip ?? null,
          meta: params.meta ?? null
        }
      });
      return;
    }

    // Fallback: если prisma client не был сгенерирован после добавления модели.
    const metaJson =
      params.meta == null ? null : JSON.stringify(params.meta);
    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "AuditLog"
        ("id","actorUserId","actorRole","action","targetType","targetId","ip","meta")
      VALUES
        (
          ${id},
          ${params.actorUserId ?? null},
          ${params.actorRole ?? null},
          ${params.action},
          ${params.targetType ?? null},
          ${params.targetId ?? null},
          ${params.ip ?? null},
          CAST(${metaJson} AS jsonb)
        );
    `;
  } catch (err) {
    // Чтобы не спамить прод: в проде тихо, в dev — предупреждение.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[audit-log] failed:", err);
    }
  }
}

