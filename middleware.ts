import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Базовые security headers для всех подходящих маршрутов.
 * CSP включаем в режиме Report-Only, чтобы собирать отчёты и не ломать фронт.
 */
export function middleware(request: NextRequest) {
  void request;
  const res = NextResponse.next();

  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // Report-Only: браузер не блокирует, а только сообщает о нарушениях.
  // Политику можно будет постепенно ужесточать после инвентаризации inline-скриптов/стилей.
  res.headers.set(
    "Content-Security-Policy-Report-Only",
    [
      "default-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss: http: ws:"
    ].join("; ")
  );

  if (process.env.NODE_ENV === "production") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Исключаем статику и служебные пути Next.js.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"
  ]
};
