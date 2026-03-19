import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  const role = (session?.user as unknown as { role?: string | null } | null)?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ message: "Доступ запрещён" }, { status: 403 });
  }

  const tests = await prisma.test.findMany({
    select: {
      id: true,
      type: true,
      title: true,
      isActive: true,
      createdAt: true
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(tests);
}

