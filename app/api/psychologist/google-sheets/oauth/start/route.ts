import { NextResponse } from "next/server";

import {
  buildGoogleSheetsAuthorizeUrl,
  isGoogleOAuthConfiguredForSheets
} from "@/lib/google-sheets";
import { requirePsychologist } from "@/lib/security/api-guards";

/** Редирект на страницу согласия Google. Query: `intent=export` — после возврата не открывать окно импорта (сценарий экспорта). */
export async function GET(request: Request) {
  try {
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;

    if (!isGoogleOAuthConfiguredForSheets()) {
      return NextResponse.json(
        {
          message:
            "Интеграция не настроена: задайте GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET и NEXTAUTH_URL (как для входа через Google)."
        },
        { status: 503 }
      );
    }

    const intent =
      new URL(request.url).searchParams.get("intent") === "export" ? "export" : undefined;
    const url = buildGoogleSheetsAuthorizeUrl(
      ctx.psychologistId,
      intent ? { intent } : undefined
    );
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("[GET /api/psychologist/google-sheets/oauth/start]", err);
    return NextResponse.json({ message: "Ошибка сервера" }, { status: 500 });
  }
}
