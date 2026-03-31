import type { JWT } from "next-auth/jwt";

import { LOGIN_SESSION_KEY_CLAIM } from "@/lib/login-session-key";

/** Читает стабильный ключ сессии из расшифрованного payload NextAuth JWT. */
export function getLoginSessionKeyFromJwtPayload(
  token: JWT | Record<string, unknown> | null | undefined
): string | null {
  if (token == null || typeof token !== "object") return null;
  const v = (token as Record<string, unknown>)[LOGIN_SESSION_KEY_CLAIM];
  return typeof v === "string" && v.length > 0 ? v : null;
}
