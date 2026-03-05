import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import {
  buildShmishekInterpretation,
  computeShmishekScores
} from "@/lib/diagnostics/shmishek";

const answersSchema = {
  validate(payload: unknown): {
    token: string;
    answers: Record<number, 0 | 1 | 2 | 3>;
  } {
    if (
      !payload ||
      typeof payload !== "object" ||
      !("token" in payload) ||
      !("answers" in payload)
    ) {
      throw new Error("Неверный формат данных");
    }

    const { token, answers } = payload as any;

    if (typeof token !== "string" || !token) {
      throw new Error("Не указан токен ссылки");
    }

    if (typeof answers !== "object" || answers === null) {
      throw new Error("Не указаны ответы");
    }

    const normalized: Record<number, 0 | 1 | 2 | 3> = {};

    for (const [k, v] of Object.entries(answers)) {
      const index = Number(k);
      if (!Number.isFinite(index)) continue;

      const num = Number(v);
      if (num < 0 || num > 3) continue;

      normalized[index] = num as 0 | 1 | 2 | 3;
    }

    if (Object.keys(normalized).length === 0) {
      throw new Error("Не заполнены ответы");
    }

    return { token, answers: normalized };
  }
};

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { token, answers } = answersSchema.validate(json);

    const link = await prisma.diagnosticLink.findUnique({
      where: { token },
      include: {
        test: true,
        client: true,
        psychologist: true
      }
    });

    if (!link || !link.test || !link.test.isActive) {
      return NextResponse.json(
        { message: "Ссылка на тест недействительна" },
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

    const scores = computeShmishekScores(answers);
    const interpretation = buildShmishekInterpretation(scores);

    await prisma.$transaction([
      prisma.testResult.create({
        data: {
          testId: link.testId,
          clientId: link.clientId ?? null,
          psychologistId: link.psychologistId ?? null,
          rawAnswers: answers,
          scaleScores: scores,
          interpretation
        }
      }),
      prisma.diagnosticLink.update({
        where: { id: link.id },
        data: {
          usedCount: {
            increment: 1
          }
        }
      }),
      prisma.diagnosticProgress.deleteMany({
        where: { diagnosticLinkId: link.id }
      })
    ]);

    return NextResponse.json(
      {
        scaleScores: scores,
        interpretation
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Shmishek submit error", error);
    const message =
      error instanceof Error ? error.message : "Внутренняя ошибка сервера";
    return NextResponse.json({ message }, { status: 400 });
  }
}

