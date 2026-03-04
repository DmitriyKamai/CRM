import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

type ParamsPromise = {
  params: Promise<{
    id: string;
  }>;
};

const updateClientSchema = z.object({
  firstName: z.string().min(1, "Укажите имя").optional(),
  lastName: z.string().min(1, "Укажите фамилию").optional(),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional()
});

export async function GET(_req: Request, { params }: ParamsPromise) {
  const { id } = await params;
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

  const client = await prisma.clientProfile.findFirst({
    where: {
      id,
      psychologistId: psych.id
    },
    include: {
      user: {
        select: {
          email: true
        }
      }
    }
  });

  if (!client) {
    return NextResponse.json({ message: "Клиент не найден" }, { status: 404 });
  }

  return NextResponse.json({
    id: client.id,
    firstName: client.firstName,
    lastName: client.lastName,
    dateOfBirth: client.dateOfBirth,
    phone: client.phone,
    notes: client.notes,
    createdAt: client.createdAt,
    email: client.user?.email ?? null
  });
}

export async function PATCH(request: Request, { params }: ParamsPromise) {
  try {
    const { id } = await params;
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
    const data = updateClientSchema.parse(json ?? {});

    const existing = await prisma.clientProfile.findFirst({
      where: { id, psychologistId: psych.id }
    });

    if (!existing) {
      return NextResponse.json({ message: "Клиент не найден" }, { status: 404 });
    }

    const dob =
      data.dateOfBirth && data.dateOfBirth.trim().length > 0
        ? new Date(data.dateOfBirth)
        : null;

    const updated = await prisma.clientProfile.update({
      where: { id: existing.id },
      data: {
        firstName: data.firstName ?? existing.firstName,
        lastName: data.lastName ?? existing.lastName,
        dateOfBirth: dob ?? existing.dateOfBirth,
        phone: data.phone ?? existing.phone,
        notes: data.notes ?? existing.notes
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Ошибка валидации", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Update client error", error);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: ParamsPromise) {
  try {
    const { id } = await params;
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

    const existing = await prisma.clientProfile.findFirst({
      where: { id, psychologistId: psych.id }
    });

    if (!existing) {
      return NextResponse.json({ message: "Клиент не найден" }, { status: 404 });
    }

    await prisma.clientProfile.update({
      where: { id: existing.id },
      data: { psychologistId: null }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete client error", error);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

