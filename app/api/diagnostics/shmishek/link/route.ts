import { handleCreateDiagnosticLink } from "@/lib/diagnostics/create-link";

export async function POST(request: Request) {
  try {
    return await handleCreateDiagnosticLink(request, {
      testType: "SHMISHEK",
      testNotFoundMessage:
        "Тест Шмишека не найден в БД. Запустите npm run prisma:seed-shmishek."
    });
  } catch (err) {
    console.error("[POST /api/diagnostics/shmishek/link]", err);
    const { NextResponse } = await import("next/server");
    const message =
      err instanceof Error ? err.message : "Не удалось создать ссылку на тест";
    return NextResponse.json({ message }, { status: 500 });
  }
}
