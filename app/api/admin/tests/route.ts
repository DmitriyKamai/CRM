import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/security/api-guards";

const querySchema = z.object({
  isActive: z.coerce.boolean().optional(),
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

  const where: Prisma.TestWhereInput = {};
  if (typeof q.isActive === "boolean") {
    where.isActive = q.isActive;
  }
  if (q.search) {
    where.title = { contains: q.search, mode: "insensitive" };
  }

  const [totalCount, tests] = await Promise.all([
    prisma.test.count({ where }),
    prisma.test.findMany({
      where,
      select: {
        id: true,
        type: true,
        title: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" },
      skip,
      take
    })
  ]);

  return NextResponse.json({ rows: tests, totalCount });
}

