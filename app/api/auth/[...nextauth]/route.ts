import { NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { runWithAuthRequestContext } from "@/lib/auth-request-context";
import { checkRateLimit } from "@/lib/rate-limit";

async function wrappedHandler(
  req: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> }
) {
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

  try {
    const headersObj: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
    const result = await runWithAuthRequestContext(headersObj, async () =>
      NextAuth(req, context, getAuthOptions(req))
    );
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

