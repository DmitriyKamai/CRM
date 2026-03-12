import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { withPrismaLock } from "@/lib/prisma-request-lock";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

const createClientSchema = z.object({
  email: z.string().email("Некорректный email").optional().or(z.literal("")),
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
  try {
    return await withPrismaLock(async () => {
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

      const selectBase = {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        phone: true,
        notes: true,
        createdAt: true,
        userId: true,
        email: true,
        user: { select: { email: true, image: true } },
        status: { select: { id: true, label: true, color: true } }
      } as const;

      type ClientRow = {
        id: string;
        firstName: string;
        lastName: string;
        dateOfBirth: Date | null;
        phone: string | null;
        notes: string | null;
        createdAt: Date;
        userId: string | null;
        email: string | null;
        user: { email: string; image: string | null } | null;
        status?: { id: string; label: string; color: string } | null;
        country?: string | null;
        city?: string | null;
        gender?: string | null;
        maritalStatus?: string | null;
      };

      let clients: ClientRow[];
      try {
        clients = await prisma.clientProfile.findMany({
          where: { psychologistId: profile.id },
          orderBy: { createdAt: "desc" },
          select: {
            ...selectBase,
            country: true,
            city: true,
            gender: true,
            maritalStatus: true
          }
        }) as ClientRow[];
      } catch (e) {
        // Колонки country, city, gender, maritalStatus могут отсутствовать, если миграция не применена
        clients = (await prisma.clientProfile.findMany({
          where: { psychologistId: profile.id },
          orderBy: { createdAt: "desc" },
          select: selectBase
        })) as ClientRow[];
        clients = clients.map((c) => ({
          ...c,
          country: null,
          city: null,
          gender: null,
          maritalStatus: null
        }));
      }

      return NextResponse.json({
        clients: clients.map(c => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          dateOfBirth: c.dateOfBirth,
          phone: c.phone,
          country: c.country ?? null,
          city: c.city ?? null,
          gender: c.gender ?? null,
          maritalStatus: c.maritalStatus ?? null,
          notes: c.notes,
          createdAt: c.createdAt,
          email: c.user?.email ?? c.email ?? null,
          hasAccount: !!c.userId,
          avatarUrl: c.user?.image ?? null,
          statusId: c.status?.id ?? null,
          statusLabel: c.status?.label ?? null,
          statusColor: c.status?.color ?? null
        }))
      });
    });
  } catch (err) {
    console.error("[GET /api/psychologist/clients]", err);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
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
    const parsed = createClientSchema.parse(json);
    const emailRaw = typeof parsed.email === "string" ? parsed.email.trim() : "";
    const email = emailRaw ? normalizeEmail(emailRaw) : null;

    const dob =
      parsed.dateOfBirth && parsed.dateOfBirth.trim().length > 0
        ? new Date(parsed.dateOfBirth)
        : null;

    if (email) {
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (user && user.role !== "CLIENT") {
        return NextResponse.json(
          { message: "Пользователь с таким email уже существует и не является клиентом" },
          { status: 400 }
        );
      }

      if (user) {
        // Пользователь с таким email есть — создаём новый профиль у этого психолога (не переиспользуем чужой)
        const existingForPsych = await prisma.clientProfile.findFirst({
          where: { psychologistId: psych.id, userId: user.id }
        });
        if (existingForPsych) {
          return NextResponse.json(
            { message: "Клиент с таким email уже есть в вашем списке" },
            { status: 400 }
          );
        }
        const clientProfile = await prisma.clientProfile.create({
          data: {
            userId: user.id,
            psychologistId: psych.id,
            firstName: parsed.firstName,
            lastName: parsed.lastName,
            dateOfBirth: dob ?? undefined,
            phone: parsed.phone,
            notes: parsed.notes
          }
        });
        return NextResponse.json(clientProfile, { status: 201 });
      }

      // Нет пользователя — проверяем уникальность email у этого психолога
      const duplicate = await prisma.clientProfile.findFirst({
        where: { psychologistId: psych.id, email }
      });
      if (duplicate) {
        return NextResponse.json(
          { message: "Клиент с таким email уже есть в вашем списке" },
          { status: 400 }
        );
      }

      // Создаём только ClientProfile, User не создаём — связка при регистрации
      const clientProfile = await prisma.clientProfile.create({
        data: {
          psychologistId: psych.id,
          email,
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          dateOfBirth: dob ?? undefined,
          phone: parsed.phone,
          notes: parsed.notes
        }
      });
      return NextResponse.json(clientProfile, { status: 201 });
    }

    // Без email — только профиль у психолога
    const clientProfile = await prisma.clientProfile.create({
      data: {
        psychologistId: psych.id,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        dateOfBirth: dob ?? undefined,
        phone: parsed.phone,
        notes: parsed.notes
      }
    });
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

