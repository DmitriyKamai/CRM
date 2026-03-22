import { NextRequest, NextResponse } from "next/server";
import { sqltag as sql } from "@prisma/client/runtime/library";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/security/api-guards";

const querySchema = z.object({
  // Поиск: частичное совпадение (contains)
  action: z.string().trim().min(1).max(128).optional(),
  actorUserId: z.string().trim().min(1).max(128).optional(),
  actorRole: z.string().trim().min(1).max(32).optional(),
  targetType: z.string().trim().min(1).max(64).optional(),
  targetId: z.string().trim().min(1).max(128).optional(),
  ip: z.string().trim().max(128).optional(),

  from: z.string().trim().optional(),
  to: z.string().trim().optional(),

  take: z.coerce.number().int().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional()
});

function parseDate(value: string | undefined, endOfDay: boolean): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  // Для input[type="date"] (YYYY-MM-DD) расширяем диапазон до конца дня,
  // чтобы не терять события после 00:00.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (endOfDay) d.setHours(23, 59, 59, 999);
    else d.setHours(0, 0, 0, 0);
  }

  return d;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const url = new URL(request.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ message: "Некорректные параметры фильтра" }, { status: 400 });
  }

  const q = parsed.data;
  const fromDate = parseDate(q.from, false);
  const toDate = parseDate(q.to, true);

  // Собираем WHERE через sqltag (аналог Prisma.sql), параметры — через плейсхолдеры.
  // $queryRaw вместо prisma.auditLog.findMany — меньше зависимость от генерации клиента на Windows.
  let whereSql = sql`TRUE`;
  if (q.action) {
    whereSql = sql`${whereSql} AND "action" ILIKE ${`%${q.action}%`}`;
  }
  if (q.actorUserId) {
    whereSql = sql`${whereSql} AND "actorUserId" = ${q.actorUserId}`;
  }
  if (q.actorRole) {
    whereSql = sql`${whereSql} AND "actorRole" ILIKE ${`%${q.actorRole}%`}`;
  }
  if (q.targetType) {
    whereSql = sql`${whereSql} AND "targetType" ILIKE ${`%${q.targetType}%`}`;
  }
  if (q.targetId) {
    whereSql = sql`${whereSql} AND "targetId" ILIKE ${`%${q.targetId}%`}`;
  }
  if (q.ip) {
    whereSql = sql`${whereSql} AND "ip" ILIKE ${`%${q.ip}%`}`;
  }
  if (fromDate) {
    whereSql = sql`${whereSql} AND "createdAt" >= ${fromDate}`;
  }
  if (toDate) {
    whereSql = sql`${whereSql} AND "createdAt" <= ${toDate}`;
  }

  const take = q.take ?? 50;
  const page = q.page ?? 1;
  const offset = (page - 1) * take;

  type AuditLogRow = {
    id: string;
    createdAt: Date;
    action: string;
    actorUserId: string | null;
    actorRole: string | null;
    targetType: string | null;
    targetId: string | null;
    ip: string | null;
    meta: unknown;
    actorEmail: string | null;
    actorName: string | null;
  };

  const rows = (await prisma.$queryRaw(
    sql`
      SELECT
        "AuditLog"."id",
        "AuditLog"."createdAt",
        "AuditLog"."action",
        "AuditLog"."actorUserId",
        "AuditLog"."actorRole",
        "AuditLog"."targetType",
        "AuditLog"."targetId",
        "AuditLog"."ip",
        "AuditLog"."meta",
        "User"."email" AS "actorEmail",
        "User"."name" AS "actorName"
      FROM "AuditLog"
      LEFT JOIN "User" ON "User"."id" = "AuditLog"."actorUserId"
      WHERE ${whereSql}
      ORDER BY "AuditLog"."createdAt" DESC
      OFFSET ${offset}
      LIMIT ${take}
    `
  )) as AuditLogRow[];

  const countRows = (await prisma.$queryRaw(
    sql`
      SELECT COUNT(*)::text AS count
      FROM "AuditLog"
      LEFT JOIN "User" ON "User"."id" = "AuditLog"."actorUserId"
      WHERE ${whereSql}
    `
  )) as Array<{ count: string }>;
  const totalCount = Number(countRows[0]?.count ?? 0);

  return NextResponse.json({
    rows: rows.map((r: AuditLogRow) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      action: r.action,
      actorUserId: r.actorUserId,
      actorRole: r.actorRole,
      actorEmail: r.actorEmail,
      actorName: r.actorName,
      targetType: r.targetType,
      targetId: r.targetId,
      ip: r.ip,
      meta: r.meta as unknown
    })),
    totalCount
  });
}

