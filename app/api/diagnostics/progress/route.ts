import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

function validateToken(token: unknown): string | null {
  if (typeof token !== "string" || !token.trim()) return null;
  return token.trim();
}

function validateAnswers(answers: unknown): Record<number, 0 | 1 | 2 | 3> | null {
  if (typeof answers !== "object" || answers === null) return null;
  const out: Record<number, 0 | 1 | 2 | 3> = {};
  for (const [k, v] of Object.entries(answers)) {
    const index = Number(k);
    if (!Number.isFinite(index)) continue;
    const num = Number(v);
    if (num < 0 || num > 3) continue;
    out[index] = num as 0 | 1 | 2 | 3;
  }
  return out;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = validateToken(searchParams.get("token"));
    if (!token) {
      return NextResponse.json(
        { message: "Не указан токен" },
        { status: 400 }
      );
    }

    const link = await prisma.diagnosticLink.findUnique({
      where: { token },
      include: {
        test: { select: { isActive: true } },
        progress: true
      }
    });

    if (!link || !link.test || !link.test.isActive) {
      return NextResponse.json(
        { message: "Ссылка недействительна" },
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
    if (link.maxUses != null && link.usedCount >= link.maxUses) {
      return NextResponse.json(
        { message: "Ссылка уже использована" },
        { status: 409 }
      );
    }

    const progress = link.progress;
    if (!progress) {
      return NextResponse.json({ answers: {}, currentStep: 0 });
    }

    const answers = progress.answers as Record<number, 0 | 1 | 2 | 3>;
    return NextResponse.json({
      answers: typeof answers === "object" && answers !== null ? answers : {},
      currentStep: Math.max(0, progress.currentStep)
    });
  } catch (err) {
    console.error("[GET /api/diagnostics/progress]", err);
    return NextResponse.json(
      { message: "Ошибка сервера" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = validateToken(body.token);
    if (!token) {
      return NextResponse.json(
        { message: "Не указан токен" },
        { status: 400 }
      );
    }

    const answers = validateAnswers(body.answers);
    if (answers === null) {
      return NextResponse.json(
        { message: "Неверный формат ответов" },
        { status: 400 }
      );
    }

    const currentStep =
      typeof body.currentStep === "number" && Number.isFinite(body.currentStep)
        ? Math.max(0, Math.floor(body.currentStep))
        : 0;

    const link = await prisma.diagnosticLink.findUnique({
      where: { token },
      select: { id: true, testId: true, expiresAt: true, maxUses: true, usedCount: true }
    });

    if (!link) {
      return NextResponse.json(
        { message: "Ссылка не найдена" },
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
    if (link.maxUses != null && link.usedCount >= link.maxUses) {
      return NextResponse.json(
        { message: "Ссылка уже использована" },
        { status: 409 }
      );
    }

    await prisma.diagnosticProgress.upsert({
      where: { diagnosticLinkId: link.id },
      create: {
        diagnosticLinkId: link.id,
        answers,
        currentStep
      },
      update: {
        answers,
        currentStep
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/diagnostics/progress]", err);
    return NextResponse.json(
      { message: "Ошибка сервера" },
      { status: 500 }
    );
  }
}
