import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/security/api-guards";
import { getClientIp } from "@/lib/security/api-guards";
import { safeLogAudit } from "@/lib/audit-log";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Неверный JSON" }, { status: 400 });
  }

  const { currentPassword, newPassword } = body;
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return NextResponse.json(
      { message: "Укажите текущий и новый пароль" },
      { status: 400 }
    );
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { message: "Новый пароль не менее 8 символов" },
      { status: 400 }
    );
  }
  if (!/[A-Za-zА-Яа-я]/.test(newPassword)) {
    return NextResponse.json(
      { message: "Новый пароль должен содержать буквы" },
      { status: 400 }
    );
  }
  if (!/\d/.test(newPassword)) {
    return NextResponse.json(
      { message: "Новый пароль должен содержать цифры" },
      { status: 400 }
    );
  }
  if (!/[^A-Za-zА-Яа-я0-9\s]/.test(newPassword)) {
    return NextResponse.json(
      { message: "Добавьте в новый пароль специальный символ (например, !, ?, %)" },
      { status: 400 }
    );
  }

  const userId = auth.userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hashedPassword: true }
  });
  if (!user?.hashedPassword) {
    return NextResponse.json(
      { message: "Смена пароля недоступна для аккаунтов без пароля" },
      { status: 400 }
    );
  }

  const valid = await bcrypt.compare(currentPassword, user.hashedPassword);
  if (!valid) {
    return NextResponse.json({ message: "Неверный текущий пароль" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { hashedPassword: hashed }
  });

  await safeLogAudit({
    action: "PASSWORD_CHANGE",
    actorUserId: userId,
    actorRole: auth.user.role,
    targetType: "User",
    targetId: userId,
    meta: { method: "self_service" },
    ip: getClientIp(request)
  });

  return NextResponse.json({ ok: true });
}
