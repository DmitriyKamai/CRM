import { NextResponse } from "next/server";
import { z } from "zod";

import { logZodError } from "@/lib/log-validation-error";

export function handleApiError(
  error: unknown,
  context: string
): NextResponse {
  if (error instanceof z.ZodError) {
    logZodError(context, error);
    return NextResponse.json(
      { message: "Ошибка валидации", issues: error.issues },
      { status: 400 }
    );
  }

  console.error(`[${context}]`, error);
  return NextResponse.json(
    { message: "Внутренняя ошибка сервера" },
    { status: 500 }
  );
}
