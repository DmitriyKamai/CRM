import { handleCreateDiagnosticLink } from "@/lib/diagnostics/create-link";

export async function POST(request: Request) {
  try {
    return await handleCreateDiagnosticLink(request, {
      testType: "SMIL",
      testNotFoundMessage:
        "Тест СМИЛ не найден в БД. Запустите npm run prisma:seed-smil."
    });
  } catch (err) {
    console.error("[POST /api/diagnostics/smil/link]", err);
    const { NextResponse } = await import("next/server");
    const message =
      err instanceof Error ? err.message : "Не удалось создать ссылку на тест";
    return NextResponse.json({ message }, { status: 500 });
  }
}
