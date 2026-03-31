import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { enrichAuthLoginSessionGeo } from "@/lib/auth-login-session";
import { getDecodedSessionJwt } from "@/lib/decoded-session-jwt";
import { requireAuth } from "@/lib/security/api-guards";

/** Ленивое гео по IP при открытии блока активных сессий (не в jwt callback). */
export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const jwt = await getDecodedSessionJwt();
  const loginSessionKey =
    jwt && typeof jwt.loginSessionKey === "string" ? jwt.loginSessionKey : null;

  if (!loginSessionKey) {
    return NextResponse.json(
      { message: "Не удалось определить сессию" },
      { status: 400 }
    );
  }

  const h = await headers();
  const headersObj: Record<string, string> = {};
  h.forEach((value, key) => {
    headersObj[key] = value;
  });

  const result = await enrichAuthLoginSessionGeo({
    userId: auth.userId,
    sessionKey: loginSessionKey,
    headers: headersObj
  });

  return NextResponse.json(result);
}
