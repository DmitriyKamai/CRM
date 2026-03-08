import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes } from "crypto";

import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

const LINK_PREFIX = "link_";
const TOKEN_BYTES = 16;
const EXPIRES_IN_SEC = 10 * 60; // 10 минут

/** POST — создать одноразовую ссылку для привязки Telegram */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Не авторизован" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ message: "Нет id пользователя" }, { status: 400 });
    }

    const token = LINK_PREFIX + randomBytes(TOKEN_BYTES).toString("hex");
    const expiresAt = new Date(Date.now() + EXPIRES_IN_SEC * 1000);

    await prisma.telegramLinkToken.create({
      data: { token, userId, expiresAt }
    });

    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    const link = botUsername
      ? `https://t.me/${botUsername.replace(/^@/, "")}?start=${token}`
      : null;

    return NextResponse.json({
      link,
      token,
      expiresIn: EXPIRES_IN_SEC
    });
  } catch (err) {
    console.error("[POST /api/user/telegram/link]", err);
    return NextResponse.json(
      { message: "Ошибка создания ссылки" },
      { status: 500 }
    );
  }
}
