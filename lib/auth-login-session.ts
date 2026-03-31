import { randomUUID } from "node:crypto";

import { UAParser } from "ua-parser-js";

import { getAuthRequestHeaders } from "@/lib/auth-request-context";
import { prisma } from "@/lib/db";

/** Не совпадает с JWE jti NextAuth (он меняется при каждом encode). */
export const LOGIN_SESSION_KEY_CLAIM = "loginSessionKey" as const;

const LAST_SEEN_TOUCH_MS = 5 * 60 * 1000;

function clientIpFromHeaders(headers: Record<string, string> | null): string {
  if (!headers) return "unknown";
  const forwarded = headers["x-forwarded-for"] ?? headers["X-Forwarded-For"];
  const first = forwarded?.split(",")[0]?.trim();
  return (
    first ??
    headers["x-real-ip"] ??
    headers["X-Real-IP"] ??
    "unknown"
  );
}

function isPrivateOrUnknownIp(ip: string): boolean {
  if (!ip || ip === "unknown") return true;
  if (ip === "::1" || ip.startsWith("127.") || ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("172.")) {
    const p = ip.split(".");
    const n = parseInt(p[1] ?? "", 10);
    if (!Number.isNaN(n) && n >= 16 && n <= 31) return true;
  }
  return false;
}

function geoFromPlatformHeaders(
  headers: Record<string, string> | null
): { country: string | null; city: string | null } {
  if (!headers) return { country: null, city: null };
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    lower[k.toLowerCase()] = v;
  }
  const country =
    lower["cf-ipcountry"] ??
    lower["x-vercel-ip-country"] ??
    lower["cloudfront-viewer-country"] ??
    null;
  const city =
    lower["x-vercel-ip-city"] ?? lower["cloudfront-viewer-city"] ?? null;
  return {
    country: country && country.length ? country : null,
    city: city && city.length ? city : null
  };
}

async function fetchGeoByIp(
  ip: string
): Promise<{ country: string | null; city: string | null }> {
  if (process.env.AUTH_LOGIN_SESSION_GEO === "0") {
    return { country: null, city: null };
  }
  if (isPrivateOrUnknownIp(ip)) return { country: null, city: null };
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      next: { revalidate: 0 }
    });
    if (!res.ok) return { country: null, city: null };
    const data = (await res.json()) as {
      success?: boolean;
      country?: string;
      city?: string;
    };
    if (data.success === false) return { country: null, city: null };
    return {
      country: data.country?.trim() || null,
      city: data.city?.trim() || null
    };
  } catch {
    return { country: null, city: null };
  } finally {
    clearTimeout(t);
  }
}

async function resolveGeo(
  headers: Record<string, string> | null
): Promise<{ country: string | null; city: string | null }> {
  const fromHeaders = geoFromPlatformHeaders(headers);
  if (fromHeaders.country || fromHeaders.city) return fromHeaders;
  const ip = clientIpFromHeaders(headers);
  return fetchGeoByIp(ip);
}

function parseUa(uaRaw: string | null): {
  browser: string | null;
  os: string | null;
  deviceLabel: string | null;
} {
  if (!uaRaw?.trim()) {
    return { browser: null, os: null, deviceLabel: null };
  }
  const p = new UAParser(uaRaw);
  const browser = [p.getBrowser().name, p.getBrowser().version?.split(".")[0]]
    .filter(Boolean)
    .join(" ")
    .trim();
  const os = [p.getOS().name, p.getOS().version?.split(".")[0]]
    .filter(Boolean)
    .join(" ")
    .trim();
  const device = p.getDevice();
  const deviceType = device.type ? `${device.type}` : "";
  const deviceLabel = [browser || "Браузер", os || null, deviceType || null]
    .filter(Boolean)
    .join(" · ");
  return {
    browser: browser || null,
    os: os || null,
    deviceLabel: deviceLabel || null
  };
}

type JwtLike = Record<string, unknown> & {
  id?: string;
  sub?: string;
  exp?: number;
  loginSessionKey?: string;
  loginSessionRevoked?: boolean;
};

function markLoginSessionRevoked(token: JwtLike): void {
  token.loginSessionRevoked = true;
  delete token.id;
  delete token.sub;
  delete token.email;
  delete token.name;
  delete token.picture;
  token.role = null;
}

/**
 * Синхронизация JWT с AuthLoginSession: отзыв, создание строки, lastSeen.
 * Вызывать из jwt callback после заполнения token.id из user.
 */
export async function syncAuthLoginSessionForJwt(params: {
  token: JwtLike;
  /** Передан при свежем входе (credentials / OAuth). */
  user?: { id: string };
}): Promise<void> {
  const { token, user } = params;
  const userId = (user?.id ?? token.id ?? token.sub) as string | undefined;
  if (!userId) return;

  if (!token.loginSessionKey || typeof token.loginSessionKey !== "string") {
    token.loginSessionKey = randomUUID();
  }
  const sessionKey = token.loginSessionKey;

  try {
    const row = await prisma.authLoginSession.findUnique({
      where: { sessionKey },
      select: {
        id: true,
        userId: true,
        revokedAt: true,
        lastSeenAt: true
      }
    });

    if (row?.revokedAt) {
      markLoginSessionRevoked(token);
      return;
    }

    if (row && row.userId !== userId) {
      markLoginSessionRevoked(token);
      return;
    }

    const headers = getAuthRequestHeaders();
    const uaHeader = headers?.["user-agent"] ?? headers?.["User-Agent"] ?? null;
    const ua = uaHeader ?? null;

    if (user) {
      const geo = await resolveGeo(headers);
      const dev = parseUa(ua);
      await prisma.authLoginSession.upsert({
        where: { sessionKey },
        create: {
          userId,
          sessionKey,
          userAgent: ua,
          browser: dev.browser,
          os: dev.os,
          deviceLabel: dev.deviceLabel,
          country: geo.country,
          city: geo.city,
          lastSeenAt: new Date()
        },
        update: {
          userId,
          userAgent: ua,
          browser: dev.browser,
          os: dev.os,
          deviceLabel: dev.deviceLabel,
          country: geo.country,
          city: geo.city,
          revokedAt: null,
          lastSeenAt: new Date()
        }
      });
      return;
    }

    if (!row) {
      const geo = await resolveGeo(headers);
      const dev = parseUa(ua);
      await prisma.authLoginSession.create({
        data: {
          userId,
          sessionKey,
          userAgent: ua,
          browser: dev.browser,
          os: dev.os,
          deviceLabel: dev.deviceLabel,
          country: geo.country,
          city: geo.city,
          lastSeenAt: new Date()
        }
      });
      return;
    }

    const now = Date.now();
    if (now - row.lastSeenAt.getTime() < LAST_SEEN_TOUCH_MS) return;
    await prisma.authLoginSession.update({
      where: { id: row.id },
      data: { lastSeenAt: new Date() }
    });
  } catch (e) {
    console.error("[auth-login-session] sync:", e);
  }
}

export async function revokeOtherLoginSessions(
  userId: string,
  keepSessionKey: string
): Promise<number> {
  const res = await prisma.authLoginSession.updateMany({
    where: {
      userId,
      sessionKey: { not: keepSessionKey },
      revokedAt: null
    },
    data: { revokedAt: new Date() }
  });
  return res.count;
}

export async function revokeLoginSessionByKey(sessionKey: string): Promise<void> {
  try {
    await prisma.authLoginSession.updateMany({
      where: { sessionKey, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  } catch (e) {
    console.error("[auth-login-session] revoke by key:", e);
  }
}

export async function listActiveLoginSessionsForUser(userId: string) {
  return prisma.authLoginSession.findMany({
    where: { userId, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      sessionKey: true,
      browser: true,
      os: true,
      deviceLabel: true,
      country: true,
      city: true,
      createdAt: true,
      lastSeenAt: true
    }
  });
}
