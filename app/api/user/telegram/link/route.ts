import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/security/api-guards";

const LINK_PREFIX = "link_";
const TOKEN_BYTES = 16;
const EXPIRES_IN_SEC = 10 * 60; // 10 минут

/** POST — создать одноразовую ссылку для привязки Telegram */
export async function POST() {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

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
