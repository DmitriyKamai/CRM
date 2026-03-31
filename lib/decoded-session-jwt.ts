import { getToken } from "next-auth/jwt";

import { buildNextAuthReqForJwt } from "@/lib/server-session";

/** Расшифрованный payload сессионного JWT (сервер, App Router). */
export async function getDecodedSessionJwt() {
  const { headers, cookies } = await buildNextAuthReqForJwt();
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) return null;
  const cookiesFlat: Record<string, string> = {};
  for (const [k, v] of Object.entries(cookies)) {
    if (v !== undefined) cookiesFlat[k] = v;
  }
  /** Минимальная форма req, совместимая с getToken в нашем App Router. */
  const reqLike = { headers, cookies: cookiesFlat };
  return getToken({
    req: reqLike as unknown as Parameters<typeof getToken>[0]["req"],
    secret
  });
}
