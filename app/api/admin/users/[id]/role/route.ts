import { NextResponse } from "next/server";

import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/security/api-guards";

type ParamsPromise = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: ParamsPromise) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const body = await request.json().catch(() => null);
  const nextRole = body?.role as string | undefined;

  if (!nextRole || !["CLIENT", "PSYCHOLOGIST", "ADMIN"].includes(nextRole)) {
    return NextResponse.json(
      { message: "Неверная роль" },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role: nextRole as Role }
  });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    role: user.role
  });
}

