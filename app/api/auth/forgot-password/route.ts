import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";

import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";
import { logZodError } from "@/lib/log-validation-error";

const forgotSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Некорректный email")
    .max(64, "Слишком длинный email")
});

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const allowedByIp = await checkRateLimit({
      key: `forgot-password:ip:${ip}`,
      windowMs: 10 * 60 * 1000,
      max: 20
    });

    if (!allowedByIp) {
      return NextResponse.json(
        {
          message: "Слишком много попыток. Попробуйте позже."
        },
        { status: 429 }
      );
    }

    const json = await request.json().catch(() => ({}));
    const data = forgotSchema.parse(json);
    const email = data.email.trim().toLowerCase();

    const allowedByEmail = await checkRateLimit({
      key: `forgot-password:email:${email}`,
      windowMs: 60 * 60 * 1000,
      max: 3
    });

    if (!allowedByEmail) {
      return NextResponse.json(
        {
          message: "Слишком много попыток для этого email. Попробуйте через час."
        },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, hashedPassword: true }
    });

    // Чтобы не раскрывать, есть ли пользователь в системе,
    // всегда возвращаем одинаковый ответ.
    if (!user || !user.hashedPassword) {
      return NextResponse.json({ ok: true });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 час

    // Удалим старые токены для этого пользователя
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    });

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt
      }
    });

    const baseUrl =
      process.env.CRM_APP_URL ??
      process.env.NEXTAUTH_URL ??
      "http://localhost:3000";
    const normalizedBase = baseUrl.replace(/\/+$/, "");
    const resetUrl = `${normalizedBase}/auth/reset-password?token=${encodeURIComponent(
      token
    )}`;

    await sendPasswordResetEmail({ to: email, resetUrl });

    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json({
      ok: true,
      ...(isDev && { resetUrl })
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logZodError("POST /api/auth/forgot-password", error);
      return NextResponse.json(
        { message: "Ошибка валидации", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("[POST /api/auth/forgot-password]", error);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

