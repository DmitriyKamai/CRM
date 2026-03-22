import { NextResponse } from "next/server";

import { createSheetsOAuth2Client } from "@/lib/google-sheets";
import { prisma } from "@/lib/db";
import { requirePsychologist } from "@/lib/security/api-guards";

/** Краткоживущий access token для Google Picker в браузере. */
export async function GET() {
  try {
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;

    const p = await prisma.psychologistProfile.findUnique({
      where: { id: ctx.psychologistId },
      select: { googleSheetsRefreshToken: true }
    });
    const refresh = p?.googleSheetsRefreshToken?.trim();
    if (!refresh) {
      return NextResponse.json(
        { message: "Сначала подключите Google в блоке импорта." },
        { status: 401 }
      );
    }

    const oauth2 = createSheetsOAuth2Client();
    oauth2.setCredentials({ refresh_token: refresh });
    const res = await oauth2.getAccessToken();
    const accessToken = res?.token;
    if (!accessToken) {
      return NextResponse.json({ message: "Не удалось получить токен доступа" }, { status: 500 });
    }

    return NextResponse.json({ accessToken });
  } catch (err) {
    console.error("[GET /api/psychologist/google-sheets/access-token]", err);
    return NextResponse.json({ message: "Ошибка сервера" }, { status: 500 });
  }
}
