import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { safeLogAudit } from "@/lib/audit-log";
import { revokeOtherLoginSessions } from "@/lib/auth-login-session";
import { getClientIpFromHeaderRecord } from "@/lib/client-ip";
import { getDecodedSessionJwt } from "@/lib/decoded-session-jwt";
import { getLoginSessionKeyFromJwtPayload } from "@/lib/login-session-jwt";
import { requireAuth } from "@/lib/security/api-guards";

export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const jwt = await getDecodedSessionJwt();
  const loginSessionKey = getLoginSessionKeyFromJwtPayload(jwt ?? undefined);

  if (!loginSessionKey) {
    return NextResponse.json(
      { message: "Не удалось определить текущую сессию" },
      { status: 400 }
    );
  }

  const revokedCount = await revokeOtherLoginSessions(auth.userId, loginSessionKey);

  const h = await headers();
  const hdr: Record<string, string> = {};
  h.forEach((v, k) => {
    hdr[k] = v;
  });
  const ip = getClientIpFromHeaderRecord(hdr);
  await safeLogAudit({
    action: "auth.login_sessions.revoke_others",
    actorUserId: auth.userId,
    actorRole: typeof auth.user.role === "string" ? auth.user.role : null,
    ip,
    meta: { revokedCount }
  });

  return NextResponse.json({ revokedCount });
}
