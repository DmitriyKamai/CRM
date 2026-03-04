import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { withPrismaLock } from "@/lib/prisma-request-lock";

export async function GET() {
  return withPrismaLock(async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Необходима авторизация" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return NextResponse.json(
      notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        read: n.read,
        createdAt: n.createdAt.toISOString()
      }))
    );
  });
}
