import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/security/api-guards";

// Список пользователей для админки
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return NextResponse.json(users);
}

