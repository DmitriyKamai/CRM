import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Обёртка для обхода отставания типов Prisma (новая модель ClientStatus ещё не сгенерирована)
const db = prisma as any;

const StatusSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1).max(64),
  color: z.string().min(1).max(64),
  order: z.number().int().optional()
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "PSYCHOLOGIST") {
      return NextResponse.json({ message: "Доступ запрещён" }, { status: 403 });
    }

    const userId = (session.user as any).id as string;
    const profile = await db.psychologistProfile.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!profile) {
      return NextResponse.json({ items: [] });
    }

    const existing = await db.clientStatus.findMany({
      where: { psychologistId: profile.id },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }]
    });

    // Если статусов ещё нет — создаём дефолтный набор
    if (existing.length === 0) {
      const defaults = [
        { key: "NEW", label: "Новый", color: "hsl(217 91% 60%)" }, // синий
        { key: "ACTIVE", label: "Активный", color: "hsl(142 76% 36%)" }, // зелёный
        { key: "PAUSED", label: "Пауза", color: "hsl(43 96% 56%)" }, // жёлтый
        { key: "ARCHIVED", label: "Архив", color: "hsl(215 16% 47%)" } // серый
      ];

      const created = await db.$transaction(
        defaults.map((s, index) =>
          db.clientStatus.create({
            data: {
              psychologistId: profile.id,
              key: s.key,
              label: s.label,
              color: s.color,
              order: index
            }
          })
        )
      );

      return NextResponse.json({ items: created });
    }

    return NextResponse.json({ items: existing });
  } catch (err) {
    console.error("[GET /api/psychologist/client-statuses]", err);
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
    const profile = await db.psychologistProfile.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!profile) {
      return NextResponse.json(
        { message: "Профиль психолога не найден" },
        { status: 400 }
      );
    }

    const json = await request.json();
    const parsed = StatusSchema.omit({ id: true }).parse(json);

    const maxOrder = await db.clientStatus.aggregate({
      where: { psychologistId: profile.id },
      _max: { order: true }
    });

    const created = await db.clientStatus.create({
      data: {
        psychologistId: profile.id,
        key: parsed.label.toUpperCase().trim().replace(/\s+/g, "_"),
        label: parsed.label,
        color: parsed.color,
        order: (maxOrder._max.order ?? 0) + 1
      }
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("[POST /api/psychologist/client-statuses]", err);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "PSYCHOLOGIST") {
      return NextResponse.json({ message: "Доступ запрещён" }, { status: 403 });
    }

    const userId = (session.user as any).id as string;
    const profile = await db.psychologistProfile.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!profile) {
      return NextResponse.json(
        { message: "Профиль психолога не найден" },
        { status: 400 }
      );
    }

    const json = await request.json();
    const body = StatusSchema.extend({
      id: z.string()
    }).parse(json);

    const updated = await db.clientStatus.updateMany({
      where: { id: body.id, psychologistId: profile.id },
      data: {
        label: body.label,
        color: body.color,
        order: body.order ?? undefined
      }
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { message: "Статус не найден" },
        { status: 404 }
      );
    }

    const status = await db.clientStatus.findUnique({ where: { id: body.id } });
    return NextResponse.json(status);
  } catch (err) {
    console.error("[PATCH /api/psychologist/client-statuses]", err);
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
    const profile = await db.psychologistProfile.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!profile) {
      return NextResponse.json(
        { message: "Профиль психолога не найден" },
        { status: 400 }
      );
    }

    const json = await request.json().catch(() => null);
    const id = z.string().parse(json?.id);

    // Обнуляем статус у клиентов, где он используется
    await db.clientProfile.updateMany({
      where: { psychologistId: profile.id, statusId: id },
      data: { statusId: null }
    });

    await db.clientStatus.deleteMany({
      where: { id, psychologistId: profile.id }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/psychologist/client-statuses]", err);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

