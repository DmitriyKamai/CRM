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

function redirectToClients(
  base: string,
  params: { sheet_oauth?: string; openImport?: boolean }
): NextResponse {
  const q = new URLSearchParams();
  if (params.sheet_oauth) q.set("sheet_oauth", params.sheet_oauth);
  if (params.openImport) q.set("openImport", "1");
  const qs = q.toString();
  return NextResponse.redirect(`${base}/psychologist/clients${qs ? `?${qs}` : ""}`);
}

/** Обмен code → refresh_token, сохранение в профиле психолога. */
export async function GET(request: Request) {
  const base = appBaseUrl(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthErr = searchParams.get("error");

  if (oauthErr) {
    const errParam = oauthErr === "access_denied" ? "access_denied" : "error";
    return redirectToClients(base, { sheet_oauth: errParam, openImport: true });
  }

  const psychologistId = state ? verifyGoogleSheetsOAuthState(state) : null;
  if (!code || !psychologistId) {
    return redirectToClients(base, { sheet_oauth: "invalid", openImport: true });
  }

  try {
    const oauth2 = createSheetsOAuth2Client();
    const { tokens } = await oauth2.getToken(code);

    const existing = await prisma.psychologistProfile.findUnique({
      where: { id: psychologistId },
      select: { googleSheetsRefreshToken: true }
    });
    if (!existing) {
      return redirectToClients(base, { sheet_oauth: "invalid", openImport: true });
    }

    const refreshToken = tokens.refresh_token ?? existing.googleSheetsRefreshToken;
    if (!refreshToken) {
      return redirectToClients(base, { sheet_oauth: "norefresh", openImport: true });
    }

    await prisma.psychologistProfile.update({
      where: { id: psychologistId },
      data: { googleSheetsRefreshToken: refreshToken }
    });

    return redirectToClients(base, { sheet_oauth: "ok", openImport: true });
  } catch (e) {
    console.error("[GET /api/psychologist/google-sheets/oauth/callback]", e);
    return redirectToClients(base, { sheet_oauth: "error", openImport: true });
  }
}
