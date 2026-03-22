import { NextResponse } from "next/server";

import { createSheetsOAuth2Client, verifyGoogleSheetsOAuthState } from "@/lib/google-sheets";
import { prisma } from "@/lib/db";

function appBaseUrl(request: Request): string {
  const env = process.env.NEXTAUTH_URL?.trim()?.replace(/\/$/, "");
  if (env) return env;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

/** Обмен code → refresh_token, сохранение в профиле психолога. */
export async function GET(request: Request) {
  const base = appBaseUrl(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const err = searchParams.get("error");

  if (err) {
    return NextResponse.redirect(`${base}/psychologist/clients?sheet_oauth=denied`);
  }

  const psychologistId = state ? verifyGoogleSheetsOAuthState(state) : null;
  if (!code || !psychologistId) {
    return NextResponse.redirect(`${base}/psychologist/clients?sheet_oauth=invalid`);
  }

  try {
    const oauth2 = createSheetsOAuth2Client();
    const { tokens } = await oauth2.getToken(code);

    const existing = await prisma.psychologistProfile.findUnique({
      where: { id: psychologistId },
      select: { googleSheetsRefreshToken: true }
    });
    if (!existing) {
      return NextResponse.redirect(`${base}/psychologist/clients?sheet_oauth=invalid`);
    }

    const refreshToken = tokens.refresh_token ?? existing.googleSheetsRefreshToken;
    if (!refreshToken) {
      return NextResponse.redirect(`${base}/psychologist/clients?sheet_oauth=norefresh`);
    }

    await prisma.psychologistProfile.update({
      where: { id: psychologistId },
      data: { googleSheetsRefreshToken: refreshToken }
    });

    return NextResponse.redirect(`${base}/psychologist/clients?sheet_oauth=ok`);
  } catch (e) {
    console.error("[GET /api/psychologist/google-sheets/oauth/callback]", e);
    return NextResponse.redirect(`${base}/psychologist/clients?sheet_oauth=error`);
  }
}
