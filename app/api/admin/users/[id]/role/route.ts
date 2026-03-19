import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { Role } from "@prisma/client";
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

