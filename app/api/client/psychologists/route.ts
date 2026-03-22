import { NextResponse } from "next/server";

import { getPublishedPsychologistsForCatalog } from "@/lib/psychologists-catalog";

/** Каталог опубликованных психологов — доступен всегда (запись на приём — отдельно, через модуль расписания). */
export async function GET() {
  try {
    const psychologists = await getPublishedPsychologistsForCatalog();

    return NextResponse.json({ psychologists });
  } catch (err) {
    console.error("[GET /api/client/psychologists]", err);
    return NextResponse.json(
      { message: "Не удалось загрузить список психологов" },
      { status: 500 }
    );
  }
}

