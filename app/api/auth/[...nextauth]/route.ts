import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Обработчик NextAuth для App Router.
// Покрывает /api/auth/* (signIn, signOut, callback и т.п.).
const nextAuthHandler = NextAuth(authOptions);

async function wrappedHandler(
  req: Request,
  context: { params: Promise<{ nextauth: string[] }> }
) {
  try {
    return await nextAuthHandler(req, context);
  } catch (err) {
    console.error("[NextAuth] handler error:", err);
    return NextResponse.json(
      { error: "Authentication error" },
      { status: 500 }
    );
  }
}

export { wrappedHandler as GET, wrappedHandler as POST };

