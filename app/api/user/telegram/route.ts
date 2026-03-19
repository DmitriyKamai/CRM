import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/security/api-guards";

/** GET — статус привязки Telegram для текущего пользователя */
export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true, telegramUsername: true }
    });

    return NextResponse.json({
      linked: Boolean(user?.telegramChatId),
      username: user?.telegramUsername ?? undefined
    });
  } catch (err) {
    console.error("[GET /api/user/telegram]", err);
    return NextResponse.json(
      { message: "Ошибка загрузки" },
      { status: 500 }
    );
  }
}

/** DELETE — отвязать Telegram */
export async function DELETE() {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    await prisma.user.update({
      where: { id: userId },
      data: { telegramChatId: null, telegramUsername: null }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/user/telegram]", err);
    return NextResponse.json(
      { message: "Ошибка отвязки" },
      { status: 500 }
    );
  }
}
