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
  return getToken({
    // next-auth/jwt ожидает форму req из Pages Router; для App Router достаточно headers + cookies.
    req: {
      headers,
      cookies: cookiesFlat
    } as Parameters<typeof getToken>[0]["req"],
    secret
  });
}
