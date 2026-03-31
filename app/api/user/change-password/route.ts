import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/security/api-guards";
import { getClientIp } from "@/lib/security/api-guards";
import { safeLogAudit } from "@/lib/audit-log";
import { changePasswordSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Неверный JSON" }, { status: 400 });
  }

  const parseResult = changePasswordSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { message: "Ошибка валидации", issues: parseResult.error.issues },
      { status: 400 }
    );
  }

  const { currentPassword, newPassword } = parseResult.data;

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
