import { NextResponse } from "next/server";

import { listActiveTherapyApproaches } from "@/lib/settings/therapy-approaches";

/** Публичный справочник подходов: нужен форме настроек и (позже) фильтру каталога. */
export async function GET() {
  try {
    const approaches = await listActiveTherapyApproaches();
    return NextResponse.json({ approaches });
  } catch (err) {
    console.error("[GET /api/therapy-approaches]", err);
    return NextResponse.json(
      { message: "Не удалось загрузить справочник" },
      { status: 500 }
    );
  }
}
