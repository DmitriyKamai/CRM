import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import {
  buildSmilInterpretation,
  computeSmilTScores,
  SMIL_QUESTION_COUNT
} from "@/lib/diagnostics/smil";
import type { SmilVariant } from "@/lib/diagnostics/smil";

/** Вариант из запроса: мужской, женский или подростковый (13–15). Для подсчёта adolescent использует нормы male. */
export type SmilRequestVariant = "male" | "female" | "adolescent";
import { withPrismaLock } from "@/lib/prisma-request-lock";

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
    if (!Number.isFinite(index) || index < 1 || index > SMIL_QUESTION_COUNT) continue;
    const num = Number(v);
    if (num !== 0 && num !== 1) continue;
    normalized[index] = num as 0 | 1;
  }
  const required = SMIL_QUESTION_COUNT;
  const answered = Object.keys(normalized).length;
  if (answered < required) {
    throw new Error(
      `Ответьте на все ${required} утверждений. Сейчас заполнено ${answered}.`
    );
  }
  return { token, answers: normalized, variant: variant as SmilRequestVariant };
}

/** Для подсчёта T-баллов и профиля: adolescent использует мужские нормы и мужской профильный лист. */
function toScoringVariant(variant: SmilRequestVariant): SmilVariant {
  return variant === "adolescent" ? "male" : variant;
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { token, answers, variant } = validatePayload(json);
    const scoringVariant = toScoringVariant(variant);

    const tScores = computeSmilTScores(answers, scoringVariant);
    const interpretation = buildSmilInterpretation(tScores, scoringVariant);

    return await withPrismaLock(async () => {
      const link = await prisma.diagnosticLink.findUnique({
        where: { token },
        include: {
          test: true,
          client: true,
          psychologist: true
        }
      });

      if (!link || !link.test || link.test.type !== "SMIL" || !link.test.isActive) {
        return NextResponse.json(
          { message: "Ссылка на тест СМИЛ недействительна" },
          { status: 404 }
        );
      }

      const now = new Date();
      if (link.expiresAt && link.expiresAt < now) {
        return NextResponse.json(
          { message: "Срок действия ссылки истёк" },
          { status: 410 }
        );
      }

      if (link.maxUses && link.usedCount >= link.maxUses) {
        return NextResponse.json(
          { message: "Ссылка уже была использована" },
          { status: 409 }
        );
      }

      await prisma.$transaction([
        prisma.testResult.create({
          data: {
            testId: link.testId,
            clientId: link.clientId ?? null,
            psychologistId: link.psychologistId ?? null,
            rawAnswers: answers,
            scaleScores: tScores,
            interpretation
          }
        }),
        prisma.diagnosticLink.update({
          where: { id: link.id },
          data: { usedCount: { increment: 1 } }
        }),
        prisma.diagnosticProgress.deleteMany({
          where: { diagnosticLinkId: link.id }
        })
      ]);

      return NextResponse.json(
        {
          scaleScores: tScores,
          interpretation,
          profileSheet: scoringVariant
        },
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
