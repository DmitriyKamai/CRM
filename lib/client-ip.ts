/**
 * Единая логика IP клиента и проверки «не публичный» для rate limit, гео и аудита.
 */

export function getClientIpFromHeaderRecord(headers: Record<string, string>): string {
  const forwarded = headers["x-forwarded-for"] ?? headers["X-Forwarded-For"];
  const first = forwarded?.split(",")[0]?.trim();
  return (
    first ??
    headers["x-real-ip"] ??
    headers["X-Real-IP"] ??
    "unknown"
  );
}

export function getClientIpFromRequest(request: Request): string {
  const h: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    h[key] = value;
  });
  return getClientIpFromHeaderRecord(h);
}

/** Локальные / частные адреса — внешний geo по ним не вызываем. */
export function isNonPublicClientIp(ip: string): boolean {
  if (!ip || ip === "unknown") return true;
  const v = ip.trim();

  if (v === "::1" || v === "0:0:0:0:0:0:0:1") return true;
  if (v.startsWith("127.") || v.startsWith("10.")) return true;
  if (v.startsWith("192.168.")) return true;
  if (v.startsWith("172.")) {
    const p = v.split(".");
    const n = parseInt(p[1] ?? "", 10);
    if (!Number.isNaN(n) && n >= 16 && n <= 31) return true;
  }

  const lower = v.toLowerCase();
  if (lower.startsWith("::ffff:")) {
    const v4 = v.slice(7);
    return isNonPublicClientIp(v4);
  }
  if (/^f[cd][0-9a-f]{2}:/i.test(v)) return true;
  if (lower.startsWith("fe80:")) return true;

  return false;
}
