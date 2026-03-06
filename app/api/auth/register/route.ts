import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

// Схема валидации для регистрации (без inviteToken, он обрабатывается отдельно)
const registerSchema = z.object({
  role: z.enum(["psychologist", "client"]),
  email: z.string().email("Некорректный email"),
  password: z.string().min(6, "Минимум 6 символов"),
  firstName: z.string().min(1, "Укажите имя"),
  lastName: z.string().min(1, "Укажите фамилию")
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

