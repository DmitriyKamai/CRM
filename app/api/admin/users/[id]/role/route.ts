import { NextResponse } from "next/server";

import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/security/api-guards";
import { getClientIp } from "@/lib/security/api-guards";
import { safeLogAudit } from "@/lib/audit-log";
import { updateUserRoleSchema } from "@/lib/schemas";

type ParamsPromise = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: ParamsPromise) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Неверный JSON" }, { status: 400 });
  }

  const parseResult = updateUserRoleSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { message: "Ошибка валидации", issues: parseResult.error.issues },
      { status: 400 }
    );
  }

  const { role: nextRole } = parseResult.data;

  if (nextRole !== "ADMIN") {
    const target = await prisma.user.findUnique({
      where: { id },
      select: { role: true }
    });

    if (target?.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { message: "Невозможно понизить единственного администратора" },
          { status: 400 }
        );
      }
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role: nextRole as Role }
  });

  await safeLogAudit({
    action: "ADMIN_USER_ROLE_CHANGE",
    actorUserId: admin.userId,
    actorRole: admin.role,
    targetType: "User",
    targetId: id,
    meta: { nextRole },
    ip: getClientIp(request)
  });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    role: user.role
  });
}

