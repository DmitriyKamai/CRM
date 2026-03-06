import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createCalendarFeedToken } from "@/lib/calendar-feed";
import { prisma } from "@/lib/db";
import { withPrismaLock } from "@/lib/prisma-request-lock";

/** GET /api/calendar/feed-url — возвращает ссылку на фид календаря для текущего психолога. */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "PSYCHOLOGIST") {
    return NextResponse.json({ message: "Доступ запрещён" }, { status: 403 });
  }

  const userId = (session.user as { id: string }).id;

  try {
    const profile = await withPrismaLock(async () => {
      const p = await prisma.psychologistProfile.findUnique({
        where: { userId },
        select: { id: true }
      });
      return p;
    });
    if (!profile) {
      return NextResponse.json({ message: "Профиль психолога не найден" }, { status: 404 });
    }

    const token = createCalendarFeedToken(profile.id);
    const baseUrl =
      process.env.NEXTAUTH_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      (typeof request.url === "string" ? new URL(request.url).origin : "http://localhost:3000");
    const url = `${baseUrl}/api/calendar/feed?token=${encodeURIComponent(token)}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[GET /api/calendar/feed-url]", err);
    return NextResponse.json(
      { message: "Не удалось сформировать ссылку" },
      { status: 500 }
    );
  }
}
