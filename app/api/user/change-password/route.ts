import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "Не авторизован" }, { status: 401 });
  }

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

  const userId = (session.user as { id: string }).id;
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

  return NextResponse.json({ ok: true });
}
