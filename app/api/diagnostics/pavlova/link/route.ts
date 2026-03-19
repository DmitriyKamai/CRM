import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { withPrismaLock } from "@/lib/prisma-request-lock";
import { getClientIp, requireRoles } from "@/lib/security/api-guards";

function randomToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function POST(request: Request) {
  const ip = getClientIp(request);

  const allowed = checkRateLimit({
    key: `diagnostic-link:${ip}`,
    windowMs: 5 * 60 * 1000,
    max: 50
  });

  if (!allowed) {
    return NextResponse.json(
      { message: "Слишком много запросов, попробуйте позже" },
      { status: 429 }
    );
  }

  try {
    return await withPrismaLock(async () => {
      const psychAuth = await requireRoles(["PSYCHOLOGIST"]);
      if (!psychAuth.ok) return psychAuth.response;
      const userId = psychAuth.userId;

      let profile = await prisma.psychologistProfile.findUnique({
        where: { userId }
      });

      if (!profile) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        profile = await prisma.psychologistProfile.create({
          data: {
            userId,
            firstName: user?.name ?? "Специалист",
            lastName: ""
          }
        });
      }

      const body = await request.json().catch(() => ({}));
      let clientId: string | null = typeof body.clientId === "string" ? body.clientId : null;
      if (clientId) {
        const clientBelongs = await prisma.clientProfile.findFirst({
          where: { id: clientId, psychologistId: profile.id },
          select: { id: true }
        });
        if (!clientBelongs) clientId = null;
      }
      const maxUses =
        typeof body.maxUses === "number" && body.maxUses > 0
          ? Math.floor(body.maxUses)
          : 1;

      const test = await prisma.test.findFirst({
        where: { type: "PAVLOVA_SHMISHEK" }
      });

      if (!test) {
        return NextResponse.json(
          {
            message:
              "Опросник (адаптация Павлова Г.Г., 2025) не найден в БД. Запустите npm run prisma:seed-pavlova."
          },
          { status: 500 }
        );
      }

      const token = randomToken();
      const link = await prisma.diagnosticLink.create({
        data: {
          testId: test.id,
          psychologistId: profile.id,
          clientId,
          token,
          maxUses
        }
      });

      if (clientId) {
        const client = await prisma.clientProfile.findUnique({
          where: { id: clientId },
          select: { userId: true }
        });
        if (client?.userId) {
          const testTitle = test.title;
          const baseUrlForNotif =
            process.env.NEXTAUTH_URL ??
            process.env.NEXT_PUBLIC_APP_URL ??
            "http://localhost:3000";
          const diagnosticUrl = `${baseUrlForNotif}/diagnostics/${link.token}`;
          await prisma.notification.create({
            data: {
              userId: client.userId,
              title: "Психолог отправил вам тест",
              body: `Вам назначен тест «${testTitle}». Пройдите его в личном кабинете или по ссылке: ${diagnosticUrl}`
            }
          });
        }
      }

      const baseUrl =
        process.env.NEXTAUTH_URL ??
        process.env.NEXT_PUBLIC_APP_URL ??
        "http://localhost:3000";

      const url = `${baseUrl}/diagnostics/${link.token}`;

      return NextResponse.json(
        {
          id: link.id,
          url,
          maxUses: link.maxUses,
          usedCount: link.usedCount
        },
        { status: 201 }
      );
    });
  } catch (err) {
    console.error("[POST /api/diagnostics/pavlova/link]", err);
    const message =
      err instanceof Error ? err.message : "Не удалось создать ссылку на тест";
    return NextResponse.json({ message }, { status: 500 });
  }
}
