import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Базовые security headers для всех подходящих маршрутов.
 * CSP намеренно не задаём — нужна отдельная настройка под скрипты/стили приложения.
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
