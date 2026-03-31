import { NextResponse } from "next/server";

import {
  dedupeLoginSessionsForDisplay,
  listActiveLoginSessionsForUser
} from "@/lib/auth-login-session";
import { deviceFormFactorFromUserAgent } from "@/lib/device-form-factor";
import { getDecodedSessionJwt } from "@/lib/decoded-session-jwt";
import { getLoginSessionKeyFromJwtPayload } from "@/lib/login-session-jwt";
import { requireAuth } from "@/lib/security/api-guards";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const jwt = await getDecodedSessionJwt();
  const loginSessionKey = getLoginSessionKeyFromJwtPayload(jwt ?? undefined);

  const rows = await listActiveLoginSessionsForUser(auth.userId);
  const visible = dedupeLoginSessionsForDisplay(rows, loginSessionKey);
  const sessions = visible.map((r) => ({
    id: r.id,
    browser: r.browser,
    os: r.os,
    deviceLabel: r.deviceLabel,
    deviceFormFactor: deviceFormFactorFromUserAgent(r.userAgent),
    country: r.country,
    city: r.city,
    createdAt: r.createdAt.toISOString(),
    lastSeenAt: r.lastSeenAt.toISOString(),
    isCurrent: loginSessionKey !== null && r.sessionKey === loginSessionKey
  }));

  return NextResponse.json({ sessions });
}
