import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  // #region agent log
  const m0 = process.memoryUsage();
  const heapUsedMb = Math.round(m0.heapUsed / 1024 / 1024);
  const heapTotalMb = Math.round(m0.heapTotal / 1024 / 1024);
  const rssMb = Math.round(m0.rss / 1024 / 1024);
  console.log(`[DBG] accounts-start heap=${heapUsedMb}/${heapTotalMb}MB rss=${rssMb}MB`);
  // #endregion
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Не авторизован" }, { status: 401 });
    }

    // Обход падения процесса при запросе к таблице Account в dev без OAuth ключей.
    const accounts: { provider: string; providerAccountId: string }[] = [];
    const resp = NextResponse.json({
      accounts: accounts.map((a) => ({
        provider: a.provider,
        label: a.provider === "google" ? "Google" : a.provider === "apple" ? "Apple" : a.provider
      }))
    });
    // #region agent log
    const m1 = process.memoryUsage();
    console.log(`[DBG] accounts-end heap=${Math.round(m1.heapUsed/1024/1024)}/${Math.round(m1.heapTotal/1024/1024)}MB rss=${Math.round(m1.rss/1024/1024)}MB [no-v8-import]`);
    // #endregion
    return resp;
  } catch (err) {
    console.error("[GET /api/user/accounts]", err);
    return NextResponse.json(
      { message: "Ошибка загрузки аккаунтов" },
      { status: 500 }
    );
  }
}
