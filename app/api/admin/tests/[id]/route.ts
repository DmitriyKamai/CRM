import { NextResponse } from "next/server";

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
  if (typeof body?.isActive !== "boolean") {
    return NextResponse.json(
      { message: "Неверный формат isActive" },
      { status: 400 }
    );
  }

  const test = await prisma.test.update({
    where: { id },
    data: { isActive: body.isActive }
  });

  return NextResponse.json({
    id: test.id,
    isActive: test.isActive
  });
}

