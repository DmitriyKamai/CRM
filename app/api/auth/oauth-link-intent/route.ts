import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, OAUTH_LINK_COOKIE } from "@/lib/auth";

/** POST: установить cookie «намерение привязать OAuth к текущему пользователю» (для проверки в signIn callback). */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "Не авторизован" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ message: "Сессия недействительна" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OAUTH_LINK_COOKIE, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600
  });
  return res;
}
