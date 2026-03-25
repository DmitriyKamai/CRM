import { handleCreateDiagnosticLink } from "@/lib/diagnostics/create-link";

export async function POST(request: Request) {
  try {
    return await handleCreateDiagnosticLink(request, {
      testType: "PAVLOVA_SHMISHEK",
      testNotFoundMessage:
        "Опросник (адаптация Павлова Г.Г., 2025) не найден в БД. Запустите npm run prisma:seed-pavlova."
    });
  } catch (err) {
    console.error("[POST /api/diagnostics/pavlova/link]", err);
    const { NextResponse } = await import("next/server");
    const message =
      err instanceof Error ? err.message : "Не удалось создать ссылку на тест";
    return NextResponse.json({ message }, { status: 500 });
  }
}
