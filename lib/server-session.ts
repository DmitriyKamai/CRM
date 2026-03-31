import { cache } from "react";
import { cookies, headers } from "next/headers";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";

import { authOptions } from "@/lib/auth";
import { runWithAuthRequestContext } from "@/lib/auth-request-context";

function headersToRecord(h: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  h.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

/** Сессия в RSC с контекстом заголовков для списка устройств и отзыва (дедупликация на один рендер). */
export const getCachedAppSession = cache(async (): Promise<Session | null> => {
  const h = await headers();
  return runWithAuthRequestContext(headersToRecord(h), () =>
    getServerSession(authOptions)
  );
});

/** Для Route Handlers: передать заголовки и cookies уже учтены внутри getServerSession. */
export async function getAppSessionInRouteHandler(): Promise<Session | null> {
  const h = await headers();
  return runWithAuthRequestContext(headersToRecord(h), () =>
    getServerSession(authOptions)
  );
}

/** Запрос с явным объектом Request (редко). */
export function getAppSessionWithRequestHeaders(
  request: Request
): Promise<Session | null> {
  return runWithAuthRequestContext(headersToRecord(request.headers), () =>
    getServerSession(authOptions)
  );
}

/** Cookies + заголовки для getToken (next-auth/jwt) в App Router. */
export async function buildNextAuthReqForJwt(): Promise<{
  headers: Record<string, string>;
  cookies: Record<string, string | undefined>;
}> {
  const h = await headers();
  const cookieStore = await cookies();
  const headersObj = headersToRecord(h);
  const cookiesObj: Record<string, string | undefined> = {};
  for (const c of cookieStore.getAll()) {
    cookiesObj[c.name] = c.value;
  }
  return { headers: headersObj, cookies: cookiesObj };
}
