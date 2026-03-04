import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { withPrismaLock } from "@/lib/prisma-request-lock";

const createClientSchema = z.object({
  email: z.string().email("Некорректный email"),
  firstName: z.string().min(1, "Укажите имя"),
  lastName: z.string().min(1, "Укажите фамилию"),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional()
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1)
});

export async function GET() {
  return withPrismaLock(async () => {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== "PSYCHOLOGIST") {
      return NextResponse.json({ message: "Доступ запрещён" }, { status: 403 });
    }

    const userId = (session.user as any).id as string;

    const profile = await prisma.psychologistProfile.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!profile) {
      return NextResponse.json({ clients: [] });
    }

    const clients = await prisma.clientProfile.findMany({
      where: { psychologistId: profile.id },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      clients: clients.map((client: (typeof clients)[number]) => ({
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        dateOfBirth: client.dateOfBirth,
        phone: client.phone,
        notes: client.notes,
        createdAt: client.createdAt,
        email: client.user?.email ?? null
      }))
    });
  });
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== "PSYCHOLOGIST") {
      return NextResponse.json({ message: "Доступ запрещён" }, { status: 403 });
    }

    const userId = (session.user as any).id as string;

    const psych = await prisma.psychologistProfile.findUnique({
      where: { userId }
    });

    if (!psych) {
      return NextResponse.json(
        { message: "Профиль психолога не найден" },
        { status: 400 }
      );
    }

    const json = await request.json();
    const data = createClientSchema.parse(json);

    // Ищем существующего пользователя-клиента по email
    let user = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (user && user.role !== "CLIENT") {
      return NextResponse.json(
        { message: "Пользователь с таким email уже существует и не является клиентом" },
        { status: 400 }
      );
    }

    if (!user) {
      // Создаём пользователя-клиента без пароля (для входа позже можно будет настроить reset)
      user = await prisma.user.create({
        data: {
          email: data.email,
          name: `${data.firstName} ${data.lastName}`,
          role: "CLIENT"
        }
      });
    }

    // Ищем/создаём клиентский профиль
    let clientProfile = await prisma.clientProfile.findUnique({
      where: { userId: user.id }
    });

    const dob =
      data.dateOfBirth && data.dateOfBirth.trim().length > 0
        ? new Date(data.dateOfBirth)
        : null;

    if (!clientProfile) {
      clientProfile = await prisma.clientProfile.create({
        data: {
          userId: user.id,
          psychologistId: psych.id,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: dob ?? undefined,
          phone: data.phone,
          notes: data.notes
        }
      });
    } else {
      clientProfile = await prisma.clientProfile.update({
        where: { id: clientProfile.id },
        data: {
          psychologistId: psych.id,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: dob ?? undefined,
          phone: data.phone,
          notes: data.notes
        }
      });
    }

    return NextResponse.json(clientProfile, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Ошибка валидации", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Create client error", error);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== "PSYCHOLOGIST") {
      return NextResponse.json({ message: "Доступ запрещён" }, { status: 403 });
    }

    const userId = (session.user as any).id as string;

    const psych = await prisma.psychologistProfile.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!psych) {
      return NextResponse.json(
        { message: "Профиль психолога не найден" },
        { status: 400 }
      );
    }

    const json = await request.json().catch(() => null);
    const data = bulkDeleteSchema.parse(json ?? {});

    const result = await prisma.clientProfile.updateMany({
      where: {
        id: { in: data.ids },
        psychologistId: psych.id
      },
      data: { psychologistId: null }
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Ошибка валидации", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Bulk delete clients error", error);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

