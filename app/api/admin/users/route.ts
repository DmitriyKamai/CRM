import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/security/api-guards";

const querySchema = z.object({
  role: z.enum(["CLIENT", "PSYCHOLOGIST", "ADMIN"]).optional(),
  search: z.string().trim().max(128).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional()
});

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ message: "Некорректные параметры запроса" }, { status: 400 });
  }

  const q = parsed.data;
  const take = q.take ?? 25;
  const page = q.page ?? 1;
  const skip = (page - 1) * take;

  const where: Prisma.UserWhereInput = {};
  if (q.role) where.role = q.role;

  if (q.search) {
    where.OR = [
      { email: { contains: q.search, mode: "insensitive" } },
      { name: { contains: q.search, mode: "insensitive" } }
    ];
  }

  try {
    const [totalCount, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: { id: true, email: true, name: true, role: true, createdAt: true }
      })
    ]);
    return NextResponse.json({ rows: users, totalCount });
  } catch (err) {
    console.error("[GET /api/admin/users]", err);
    return NextResponse.json({ message: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

