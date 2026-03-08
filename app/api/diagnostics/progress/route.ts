import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { withPrismaLock } from "@/lib/prisma-request-lock";

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
    return await withPrismaLock(async () => {
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
        return NextResponse.json({ answers: {}, currentStep: 0, meta: null });
      }

      const answers = progress.answers as Record<number, 0 | 1 | 2 | 3>;
      const meta = (progress as { meta?: unknown }).meta as Record<string, unknown> | null;
      return NextResponse.json({
        answers: typeof answers === "object" && answers !== null ? answers : {},
        currentStep: Math.max(0, progress.currentStep),
        meta: meta ?? null
      });
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
    const currentStep =
      typeof body.currentStep === "number" && Number.isFinite(body.currentStep)
        ? Math.max(0, Math.floor(body.currentStep))
        : undefined;
    const meta =
      body.meta !== undefined && body.meta !== null && typeof body.meta === "object"
        ? (body.meta as Record<string, unknown>)
        : undefined;

    return await withPrismaLock(async () => {
      const link = await prisma.diagnosticLink.findUnique({
        where: { token },
        include: { progress: true }
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

      const existing = link.progress;
      const prevAnswers = existing?.answers as Record<number, 0 | 1 | 2 | 3> | undefined;
      const prevStep = existing?.currentStep ?? 0;
      const prevMeta = (existing as { meta?: unknown } | null | undefined)?.meta as Record<string, unknown> | null | undefined;

      const nextAnswers = answers ?? prevAnswers ?? {};
      const nextStep = currentStep ?? prevStep;
      const nextMeta = meta !== undefined ? meta : prevMeta;

      const metaPayload =
        nextMeta !== undefined && nextMeta !== null
          ? (nextMeta as Prisma.InputJsonValue)
          : undefined;

      await prisma.diagnosticProgress.upsert({
        where: { diagnosticLinkId: link.id },
        create: {
          diagnosticLinkId: link.id,
          answers: nextAnswers,
          currentStep: nextStep,
          ...(metaPayload !== undefined && { meta: metaPayload })
        },
        update: {
          answers: nextAnswers,
          currentStep: nextStep,
          ...(nextMeta !== undefined && {
          meta: nextMeta === null ? Prisma.JsonNull : (nextMeta as Prisma.InputJsonValue)
        })
        }
      });

      return NextResponse.json({ ok: true });
    });
  } catch (err) {
    console.error("[PATCH /api/diagnostics/progress]", err);
    return NextResponse.json(
      { message: "Ошибка сервера" },
      { status: 500 }
    );
  }
}
