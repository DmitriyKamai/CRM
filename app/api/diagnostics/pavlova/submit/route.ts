import { NextResponse } from "next/server";

import { assertModuleEnabled } from "@/lib/platform-modules";
import { withPrismaLock } from "@/lib/prisma-request-lock";
import {
  buildPavlovaInterpretation,
  computePavlovaScores
} from "@/lib/diagnostics/pavlova";
import { validateDiagnosticLink } from "@/lib/diagnostics/link-validation";
import { saveTestResultAndIncrement } from "@/lib/diagnostics/submit-result";

const REQUIRED_QUESTIONS = 88;

function validatePayload(payload: unknown): {
  token: string;
  answers: Record<number, 0 | 1 | 2>;
} {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("token" in payload) ||
    !("answers" in payload)
  ) {
    throw new Error("Неверный формат данных");
  }

  const { token, answers } = payload as { token: unknown; answers: unknown };

  if (typeof token !== "string" || !token) {
    throw new Error("Не указан токен ссылки");
  }

  if (typeof answers !== "object" || answers === null) {
    throw new Error("Не указаны ответы");
  }

  const normalized: Record<number, 0 | 1 | 2> = {};

  for (const [k, v] of Object.entries(answers)) {
    const index = Number(k);
    if (!Number.isInteger(index) || index < 1 || index > REQUIRED_QUESTIONS)
      continue;
    const num = Number(v);
    if (num !== 0 && num !== 1 && num !== 2) continue;
    normalized[index] = num as 0 | 1 | 2;
  }

  for (let q = 1; q <= REQUIRED_QUESTIONS; q++) {
    if (normalized[q] === undefined) {
      throw new Error(
        `Нет ответа на вопрос ${q}. Необходимо ответить на все ${REQUIRED_QUESTIONS} вопросов.`
      );
    }
  }

  return { token, answers: normalized };
}

export async function POST(request: Request) {
  try {
    const mod = await assertModuleEnabled("diagnostics");
    if (mod) return mod;

    const json = await request.json();
    const { token, answers } = validatePayload(json);

    const scores = computePavlovaScores(answers);
    const interpretation = buildPavlovaInterpretation(scores);

    return await withPrismaLock(async () => {
      const result = await validateDiagnosticLink(token, "PAVLOVA_SHMISHEK");
      if (!result.ok) return result.response;

      await saveTestResultAndIncrement({
        link: result.link,
        rawAnswers: answers,
        scaleScores: scores,
        interpretation
      });

      return NextResponse.json({ scaleScores: scores, interpretation }, { status: 201 });
    });
  } catch (error) {
    console.error("Pavlova submit error", error);
    const message =
      error instanceof Error ? error.message : "Внутренняя ошибка сервера";
    return NextResponse.json({ message }, { status: 400 });
  }
}
