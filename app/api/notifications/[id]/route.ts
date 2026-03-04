import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { withPrismaLock } from "@/lib/prisma-request-lock";

type ParamsPromise = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: ParamsPromise) {
  return withPrismaLock(async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Необходима авторизация" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const { id } = await params;

    const notification = await prisma.notification.findFirst({
      where: { id, userId }
    });
    if (!notification) {
      return NextResponse.json({ message: "Уведомление не найдено" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const read = body?.read;
    if (typeof read !== "boolean") {
      return NextResponse.json({ message: "Укажите read: true или false" }, { status: 400 });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read }
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      body: updated.body,
      read: updated.read,
      createdAt: updated.createdAt.toISOString()
    });
  });
}

export async function DELETE(_request: Request, { params }: ParamsPromise) {
  return withPrismaLock(async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Необходима авторизация" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const { id } = await params;

    const notification = await prisma.notification.findFirst({
      where: { id, userId }
    });
    if (!notification) {
      return NextResponse.json({ message: "Уведомление не найдено" }, { status: 404 });
    }

    await prisma.notification.delete({ where: { id } });
    return NextResponse.json({ success: true });
  });
}
