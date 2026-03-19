import { NextResponse } from "next/server";

import { OAUTH_LINK_COOKIE } from "@/lib/auth";
import { requireAuth } from "@/lib/security/api-guards";

/** POST: установить cookie «намерение привязать OAuth к текущему пользователю» (для проверки в signIn callback). */
export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const userId = auth.userId;
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
