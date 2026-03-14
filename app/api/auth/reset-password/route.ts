import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { logZodError } from "@/lib/log-validation-error";

const resetSchema = z.object({
  token: z.string().trim().min(1, "Токен обязателен"),
  newPassword: z
    .string()
    .min(8, "Минимум 8 символов")
    .regex(/[A-Za-zА-Яа-я]/, "Пароль должен содержать буквы")
    .regex(/\d/, "Пароль должен содержать цифры")
    .regex(
      /[^A-Za-zА-Яа-я0-9\s]/,
      "Добавьте специальный символ (например, !, ?, %)"
    )
});

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const data = resetSchema.parse(json);

    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token: data.token },
      include: { user: { select: { id: true } } }
    });

    if (
      !tokenRecord ||
      tokenRecord.usedAt ||
      tokenRecord.expiresAt < new Date()
    ) {
      return NextResponse.json(
        { message: "Ссылка для восстановления недействительна или устарела" },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(data.newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { hashedPassword: hashed }
      }),
      prisma.passwordResetToken.update({
        where: { token: tokenRecord.token },
        data: { usedAt: new Date() }
      }),
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: tokenRecord.userId,
          token: { not: tokenRecord.token }
        }
      })
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logZodError("POST /api/auth/reset-password", error);
      return NextResponse.json(
        { message: "Ошибка валидации", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("[POST /api/auth/reset-password]", error);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

