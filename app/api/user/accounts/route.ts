import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Не авторизован" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ message: "Сессия недействительна" }, { status: 401 });
    }

    const rows = await prisma.account.findMany({
      where: { userId },
      select: { provider: true }
    });

    const accounts = rows.map((a) => ({
      provider: a.provider,
      label: a.provider === "google" ? "Google" : a.provider === "apple" ? "Apple" : a.provider
    }));

    return NextResponse.json({ accounts });
  } catch (err) {
    console.error("[GET /api/user/accounts]", err);
    return NextResponse.json(
      { message: "Ошибка загрузки аккаунтов" },
      { status: 500 }
    );
  }
}

/** Отвязать OAuth-аккаунт (google | apple). Нельзя отвязать последний способ входа. */
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Не авторизован" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ message: "Сессия недействительна" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");
    if (provider !== "google" && provider !== "apple") {
      return NextResponse.json(
        { message: "Укажите provider: google или apple" },
        { status: 400 }
      );
    }

    const [user, accountCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { hashedPassword: true }
      }),
      prisma.account.count({ where: { userId } })
    ]);

    if (!user) {
      return NextResponse.json({ message: "Пользователь не найден" }, { status: 401 });
    }

    const hasPassword = !!user.hashedPassword?.trim();
    if (accountCount <= 1 && !hasPassword) {
      return NextResponse.json(
        { message: "Нельзя отвязать последний способ входа. Сначала установите пароль в разделе «Безопасность»." },
        { status: 400 }
      );
    }

    await prisma.account.deleteMany({
      where: { userId, provider }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/user/accounts]", err);
    return NextResponse.json(
      { message: "Не удалось отвязать аккаунт" },
      { status: 500 }
    );
  }
}
