import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Не авторизован" }, { status: 401 });
    }

    // Обход падения процесса при запросе к таблице Account в dev без OAuth ключей.
    const accounts: { provider: string; providerAccountId: string }[] = [];
    return NextResponse.json({
      accounts: accounts.map((a) => ({
        provider: a.provider,
        label: a.provider === "google" ? "Google" : a.provider === "apple" ? "Apple" : a.provider
      }))
    });
  } catch (err) {
    console.error("[GET /api/user/accounts]", err);
    return NextResponse.json(
      { message: "Ошибка загрузки аккаунтов" },
      { status: 500 }
    );
  }
}
