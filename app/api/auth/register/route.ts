import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

// Схема валидации для регистрации (без inviteToken, он обрабатывается отдельно)
const registerSchema = z.object({
  role: z.enum(["psychologist", "client"]),
  email: z
    .string()
    .trim()
    .email("Некорректный email")
    .max(64, "Слишком длинный email"),
  password: z
    .string()
    .min(8, "Минимум 8 символов")
    .regex(/[A-Za-zА-Яа-я]/, "Пароль должен содержать буквы")
    .regex(/\d/, "Пароль должен содержать цифры")
    .regex(/[^A-Za-zА-Яа-я0-9\s]/, "Добавьте специальный символ (например, !, ?, %)"),
  firstName: z
    .string()
    .trim()
    .min(2, "Имя не короче 2 символов")
    .max(32, "Имя слишком длинное"),
  lastName: z
    .string()
    .trim()
    .min(2, "Фамилия не короче 2 символов")
    .max(32, "Фамилия слишком длинная")
});

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const allowed = checkRateLimit({
      key: `register:${ip}`,
      windowMs: 10 * 60 * 1000,
      max: 20
    });

    if (!allowed) {
      return NextResponse.json(
        { message: "Слишком много попыток регистрации, попробуйте позже" },
        { status: 429 }
      );
    }

    const json = await request.json();
    const inviteTokenRaw =
      typeof json.inviteToken === "string" && json.inviteToken.length > 0
        ? (json.inviteToken as string)
        : null;
    const data = registerSchema.parse(json);

    const existing = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existing) {
      return NextResponse.json(
        { message: "Пользователь с таким email уже существует" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const role =
      data.role === "psychologist" ? "PSYCHOLOGIST" : ("CLIENT" as const);

    const emailNormalized = data.email.trim().toLowerCase();

    const user = await prisma.user.create({
      data: {
        email: emailNormalized,
        name: `${data.firstName} ${data.lastName}`,
        hashedPassword,
        role,
        ...(role === "PSYCHOLOGIST"
          ? {
              psychologistProfile: {
                create: {
                  firstName: data.firstName,
                  lastName: data.lastName
                }
              }
            }
          : undefined)
      }
    });

    if (role === "CLIENT") {
      let linked = false;

      if (inviteTokenRaw) {
        const invite = await prisma.clientRegistrationInvite.findUnique({
          where: { token: inviteTokenRaw }
        });

        if (invite && !invite.usedAt) {
          await prisma.$transaction([
            prisma.clientProfile.updateMany({
              where: {
                id: invite.clientId,
                userId: null
              },
              data: {
                userId: user.id,
                // обновим email профиля, чтобы он совпадал с регистрацией
                email: emailNormalized
              }
            }),
            prisma.clientRegistrationInvite.update({
              where: { token: invite.token },
              data: { usedAt: new Date() }
            })
          ]);
          linked = true;
        }
      }

      if (!linked) {
        await prisma.clientProfile.updateMany({
          where: {
            email: emailNormalized,
            userId: null
          },
          data: { userId: user.id }
        });
      }
    }

    return NextResponse.json(
      { id: user.id, email: user.email, role: user.role },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("[POST /api/auth/register] Ошибка валидации:", error);
      console.error("[POST /api/auth/register] issues:", JSON.stringify(error.issues, null, 2));
      return NextResponse.json(
        { message: "Ошибка валидации", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Register error", error);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

