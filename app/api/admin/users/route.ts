import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

// Список пользователей для админки
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ message: "Доступ запрещён" }, { status: 403 });
  }

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

