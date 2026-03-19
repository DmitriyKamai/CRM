import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/security/api-guards";

type ParamsPromise = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: ParamsPromise) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;
    const userId = auth.userId;
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
  } catch (err) {
    console.error("[PATCH /api/notifications/[id]]", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { message: message ? `Внутренняя ошибка сервера: ${message}` : "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: ParamsPromise) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;
    const userId = auth.userId;
    const { id } = await params;

    const notification = await prisma.notification.findFirst({
      where: { id, userId }
    });
    if (!notification) {
      return NextResponse.json({ message: "Уведомление не найдено" }, { status: 404 });
    }

    await prisma.notification.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/notifications/[id]]", err);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
