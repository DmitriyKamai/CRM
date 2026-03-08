import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

const BOT_SECRET_HEADER = "x-bot-secret";

/**
 * Вызывается только ботом: привязывает chatId к пользователю по одноразовому токену.
 * Заголовок X-Bot-Secret должен совпадать с TELEGRAM_BOT_SECRET.
 */
export async function POST(request: Request) {
  try {
    const secret = request.headers.get(BOT_SECRET_HEADER);
    const expected = process.env.TELEGRAM_BOT_SECRET;

    if (!expected || secret !== expected) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const token =
      typeof body?.token === "string" ? body.token.trim() : null;
    const chatId =
      typeof body?.chatId === "number" ? body.chatId : typeof body?.chatId === "string" ? Number(body.chatId) : null;
    const username =
      typeof body?.username === "string" ? body.username.trim() || null : null;

    if (!token || chatId == null || Number.isNaN(chatId)) {
      return NextResponse.json(
        { message: "Нужны token и chatId" },
        { status: 400 }
      );
    }

    const linkToken = await prisma.telegramLinkToken.findUnique({
      where: { token },
      select: { userId: true, expiresAt: true }
    });

    if (!linkToken) {
      return NextResponse.json({ message: "Токен не найден" }, { status: 404 });
    }

    if (new Date() > linkToken.expiresAt) {
      await prisma.telegramLinkToken.delete({ where: { token } }).catch(() => {});
      return NextResponse.json({ message: "Токен истёк" }, { status: 410 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: linkToken.userId },
        data: {
          telegramChatId: String(chatId),
          telegramUsername: username
        }
      }),
      prisma.telegramLinkToken.delete({ where: { token } })
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/telegram/claim-link]", err);
    return NextResponse.json(
      { message: "Ошибка сервера" },
      { status: 500 }
    );
  }
}
