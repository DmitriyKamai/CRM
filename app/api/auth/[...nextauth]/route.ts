import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const nextAuthHandler = NextAuth(authOptions);

async function wrappedHandler(
  req: Request,
  context: { params: Promise<{ nextauth: string[] }> }
) {
  // #region agent log
  const url = req.url;
  const m0 = process.memoryUsage();
  console.log(`[DBG] nextauth-start ${url} heap=${Math.round(m0.heapUsed/1024/1024)}/${Math.round(m0.heapTotal/1024/1024)}MB rss=${Math.round(m0.rss/1024/1024)}MB`);
  // #endregion
  try {
    const result = await nextAuthHandler(req, context);
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

