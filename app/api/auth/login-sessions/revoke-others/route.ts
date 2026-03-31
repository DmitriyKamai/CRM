import { NextResponse } from "next/server";

import { revokeOtherLoginSessions } from "@/lib/auth-login-session";
import { getDecodedSessionJwt } from "@/lib/decoded-session-jwt";
import { requireAuth } from "@/lib/security/api-guards";

export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const jwt = await getDecodedSessionJwt();
  const loginSessionKey =
    jwt && typeof jwt.loginSessionKey === "string" ? jwt.loginSessionKey : null;

  if (!loginSessionKey) {
    return NextResponse.json(
      { message: "Не удалось определить текущую сессию" },
      { status: 400 }
    );
  }

  const revokedCount = await revokeOtherLoginSessions(auth.userId, loginSessionKey);
  return NextResponse.json({ revokedCount });
}
