import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Базовые security headers для всех подходящих маршрутов.
 * CSP включаем в режиме Report-Only, чтобы собирать отчёты и не ломать фронт.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function proxy(_request: NextRequest) {
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
      // Inline/eval пока не включаем для сокращения площади атаки.
      // CSP Report-Only: браузер не блокирует, а сообщает о нарушениях.
      // Next.js/React runtime может использовать inline-сценарии.
      // Чтобы не спамить отчётами в report-only режиме, разрешаем inline только для script-src-elem.
      // Next.js может помечать inline и под script-src: в Report-Only допускаем inline в обоих,
      // чтобы не засорять отчёты; при переходе на enforcing — nonce/хэши.
      "script-src 'self' blob: 'unsafe-inline'",
      "script-src-elem 'self' blob: 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://lh3.googleusercontent.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https: wss: http: ws:",
      "report-uri /api/csp-report"
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
