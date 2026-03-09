import { NextResponse } from "next/server";

import { getSmilQuestions } from "@/lib/diagnostics/smil-questions";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const variant = searchParams.get("variant");
    if (variant !== "male" && variant !== "female" && variant !== "adolescent") {
      return NextResponse.json(
        { message: "Укажите вариант: variant=male, variant=female или variant=adolescent" },
        { status: 400 }
      );
    }
    const questions = getSmilQuestions(variant as "male" | "female" | "adolescent");
    return NextResponse.json({
      questions: questions.map((q) => ({ id: `q-${q.index}`, index: q.index, text: q.text }))
    });
  } catch (err) {
    console.error("[GET /api/diagnostics/smil/questions]", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { message: message ? `Ошибка сервера: ${message}` : "Ошибка сервера" },
      { status: 500 }
    );
  }
}
