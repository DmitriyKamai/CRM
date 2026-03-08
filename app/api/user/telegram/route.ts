import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

const LINK_PREFIX = "link_";
const TOKEN_BYTES = 16;
const EXPIRES_IN_SEC = 10 * 60; // 10 минут

/** GET — статус привязки Telegram для текущего пользователя */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Не авторизован" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ message: "Нет id пользователя" }, { status: 400 });
    }

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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Не авторизован" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ message: "Нет id пользователя" }, { status: 400 });
    }

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
