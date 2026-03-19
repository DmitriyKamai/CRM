import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { withPrismaLock } from "@/lib/prisma-request-lock";
import { requireAuth } from "@/lib/security/api-guards";

export async function GET() {
  try {
    return await withPrismaLock(async () => {
      const auth = await requireAuth();
      if (!auth.ok) return auth.response;
      const userId = auth.userId;
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
  } catch (err) {
    const isConnectionError =
      err &&
      typeof err === "object" &&
      "name" in err &&
      (err as Error).name === "PrismaClientInitializationError";
    if (isConnectionError) {
      return NextResponse.json([]);
    }
    console.error("[GET /api/notifications]", err);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
