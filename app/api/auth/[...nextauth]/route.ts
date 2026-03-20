import { NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

async function wrappedHandler(
  req: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> }
) {
  const url = req.url;
  const pathname = req.nextUrl.pathname;

  // Простое rate limiting для входа по паролю (credentials).
  // Ограничиваем только POST на /api/auth/callback/credentials, чтобы не мешать OAuth и другим операциям.
  if (
    req.method === "POST" &&
    pathname.endsWith("/api/auth/callback/credentials")
  ) {
    const ip =
      req.headers.get("x-forwarded-for") ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const allowed = await checkRateLimit({
      key: `login:${ip}`,
      windowMs: 60 * 1000,
      max: 5
    });

    if (!allowed) {
      return NextResponse.json(
        {
          error: "Слишком много попыток входа, попробуйте позже"
        },
        { status: 429 }
      );
    }
  }

  const m0 = process.memoryUsage();
  console.log(`[DBG] nextauth-start ${url} heap=${Math.round(m0.heapUsed/1024/1024)}/${Math.round(m0.heapTotal/1024/1024)}MB rss=${Math.round(m0.rss/1024/1024)}MB`);
  try {
    const result = await NextAuth(req, context, getAuthOptions(req));
    // #region agent log
    const m1 = process.memoryUsage();
    console.log(`[DBG] nextauth-end ${url} heap=${Math.round(m1.heapUsed/1024/1024)}/${Math.round(m1.heapTotal/1024/1024)}MB rss=${Math.round(m1.rss/1024/1024)}MB`);
    // #endregion
    return result;
  } catch (err) {
    console.error("[NextAuth] handler error:", err);
    return NextResponse.json(
      { error: "Authentication error" },
      { status: 500 }
    );
  }
}

export { wrappedHandler as GET, wrappedHandler as POST };

