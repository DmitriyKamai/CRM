import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const definitionSchema = z.object({
  id: z.string().optional(),
  group: z.string().trim().max(64).nullable().optional(),
  key: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(128),
  description: z.string().trim().max(512).nullable().optional(),
  type: z.enum([
    "TEXT",
    "NUMBER",
    "DATE",
    "SELECT",
    "MULTILINE",
    "BOOLEAN",
    "MULTI_SELECT"
  ]),
  options: z
    .object({
      required: z.boolean().optional(),
      selectOptions: z
        .array(
          z.object({
            value: z.string().trim().min(1).max(64),
            label: z.string().trim().min(1).max(128)
          })
        )
        .optional()
    })
    .nullable()
    .optional()
});

export async function GET() {
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
    return NextResponse.json({ items: [] });
  }

  const defs = await prisma.customFieldDefinition.findMany({
    where: { psychologistId: profile.id, target: "CLIENT" },
    orderBy: [{ group: "asc" }, { order: "asc" }, { createdAt: "asc" }]
  });

  return NextResponse.json({
    items: defs
  });
}

export async function POST(request: Request) {
  try {
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
      return NextResponse.json(
        { message: "Профиль психолога не найден" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = definitionSchema.parse(body);

    const orderBase =
      (await prisma.customFieldDefinition.count({
        where: {
          psychologistId: profile.id,
          target: "CLIENT",
          group: parsed.group ?? null
        }
      })) ?? 0;

    const created = await prisma.customFieldDefinition.create({
      data: {
        psychologistId: profile.id,
        target: "CLIENT",
        key: parsed.key,
        label: parsed.label,
        description: parsed.description ?? null,
        type: parsed.type,
        group: parsed.group ?? null,
        order: orderBase,
        options: parsed.options ?? undefined
      }
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Ошибка валидации", issues: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/psychologist/custom-fields]", error);
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

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ message: "Не указан id поля" }, { status: 400 });
    }

    const userId = (session.user as any).id as string;
    const profile = await prisma.psychologistProfile.findUnique({
      where: { userId },
      select: { id: true }
    });
    if (!profile) {
      return NextResponse.json(
        { message: "Профиль психолога не найден" },
        { status: 400 }
      );
    }

    await prisma.customFieldDefinition.deleteMany({
      where: { id, psychologistId: profile.id, target: "CLIENT" }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/psychologist/custom-fields]", error);
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

    const body = await request.json().catch(() => ({}));
    const partialSchema = definitionSchema
      .pick({
        id: true,
        group: true,
        label: true,
        description: true
      })
      .partial()
      .required({ id: true });
    const parsed = partialSchema.parse(body);

    const userId = (session.user as any).id as string;
    const profile = await prisma.psychologistProfile.findUnique({
      where: { userId },
      select: { id: true }
    });
    if (!profile) {
      return NextResponse.json(
        { message: "Профиль психолога не найден" },
        { status: 400 }
      );
    }

    const updated = await prisma.customFieldDefinition.updateMany({
      where: { id: parsed.id, psychologistId: profile.id, target: "CLIENT" },
      data: {
        label: parsed.label ?? undefined,
        description:
          parsed.description !== undefined ? parsed.description ?? null : undefined,
        group:
          parsed.group !== undefined
            ? parsed.group && parsed.group.trim().length > 0
              ? parsed.group.trim()
              : null
            : undefined
        // key и type намеренно не меняем, чтобы не ломать существующие данные
      }
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { message: "Поле не найдено или доступ запрещён" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Ошибка валидации", issues: error.issues },
        { status: 400 }
      );
    }
    console.error("[PATCH /api/psychologist/custom-fields]", error);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

