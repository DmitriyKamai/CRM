import { NextResponse } from "next/server";

import { assertModuleEnabled } from "@/lib/platform-modules";
import { withPrismaLock } from "@/lib/prisma-request-lock";
import {
  buildSmilInterpretation,
  computeSmilTScores,
  SMIL_QUESTION_COUNT
} from "@/lib/diagnostics/smil";
import type { SmilVariant } from "@/lib/diagnostics/smil";
import { validateDiagnosticLink } from "@/lib/diagnostics/link-validation";
import { saveTestResultAndIncrement } from "@/lib/diagnostics/submit-result";

export type SmilRequestVariant = "male" | "female" | "adolescent";

function validatePayload(payload: unknown): {
  token: string;
  answers: Record<number, 0 | 1>;
  variant: SmilRequestVariant;
} {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("token" in payload) ||
    !("answers" in payload) ||
    !("variant" in payload)
  ) {
    throw new Error("Неверный формат: нужны token, answers, variant");
  }
  const { token, answers, variant } = payload as {
    token: unknown;
    answers: unknown;
    variant: unknown;
  };
  if (typeof token !== "string" || !token) {
    throw new Error("Не указан токен ссылки");
  }
  if (variant !== "male" && variant !== "female" && variant !== "adolescent") {
    throw new Error("variant должен быть male, female или adolescent");
  }
  if (typeof answers !== "object" || answers === null) {
    throw new Error("Не указаны ответы");
  }
  const normalized: Record<number, 0 | 1> = {};
  for (const [k, v] of Object.entries(answers)) {
    const index = Number(k);
    if (!Number.isInteger(index) || index < 1 || index > SMIL_QUESTION_COUNT)
      continue;
    const num = Number(v);
    if (num !== 0 && num !== 1) continue;
    normalized[index] = num as 0 | 1;
  }
  const answered = Object.keys(normalized).length;
  if (answered < SMIL_QUESTION_COUNT) {
    throw new Error(
      `Ответьте на все ${SMIL_QUESTION_COUNT} утверждений. Сейчас заполнено ${answered}.`
    );
  }
  return { token, answers: normalized, variant: variant as SmilRequestVariant };
}

function toScoringVariant(variant: SmilRequestVariant): SmilVariant {
  return variant === "adolescent" ? "male" : variant;
}

export async function POST(request: Request) {
  try {
    const mod = await assertModuleEnabled("diagnostics");
    if (mod) return mod;

    const json = await request.json();
    const { token, answers, variant } = validatePayload(json);
    const scoringVariant = toScoringVariant(variant);

    const tScores = computeSmilTScores(answers, scoringVariant);
    const interpretation = buildSmilInterpretation(tScores, scoringVariant);

    return await withPrismaLock(async () => {
      const result = await validateDiagnosticLink(token, "SMIL");
      if (!result.ok) return result.response;

      await saveTestResultAndIncrement({
        link: result.link,
        rawAnswers: answers,
        scaleScores: tScores,
        interpretation
      });

      return NextResponse.json(
        { scaleScores: tScores, interpretation, profileSheet: scoringVariant },
        { status: 201 }
      );
    });
  } catch (error) {
    console.error("SMIL submit error", error);
    const message =
      error instanceof Error ? error.message : "Внутренняя ошибка сервера";
    return NextResponse.json({ message }, { status: 400 });
  }
}
