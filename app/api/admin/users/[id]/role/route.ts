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

  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ message: "Доступ запрещён" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const role = body?.role as string | undefined;

  if (!role || !["CLIENT", "PSYCHOLOGIST", "ADMIN"].includes(role)) {
    return NextResponse.json(
      { message: "Неверная роль" },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role: role as Role }
  });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    role: user.role
  });
}

