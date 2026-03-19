import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

type ParamsPromise = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: ParamsPromise) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const role = (session?.user as unknown as { role?: string | null } | null)?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ message: "Доступ запрещён" }, { status: 403 });
  }

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

