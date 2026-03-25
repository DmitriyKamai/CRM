import { NextResponse } from "next/server";

import type { TestType } from "@prisma/client";

import { safeLogAudit } from "@/lib/audit-log";
import { ClientHistoryType, safeLogClientHistory } from "@/lib/client-history";
import { prisma } from "@/lib/db";
import { assertModuleEnabled } from "@/lib/platform-modules";
import { checkRateLimit } from "@/lib/rate-limit";
import { withPrismaLock } from "@/lib/prisma-request-lock";
import { getClientIp, requireRoles } from "@/lib/security/api-guards";

import { randomToken } from "./token";

interface CreateLinkOptions {
  testType: TestType;
  testNotFoundMessage: string;
}

export async function handleCreateDiagnosticLink(
  request: Request,
  options: CreateLinkOptions
): Promise<NextResponse> {
  const ip = getClientIp(request);

  const allowed = await checkRateLimit({
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

  const mod = await assertModuleEnabled("diagnostics");
  if (mod) return mod;

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
    let clientId: string | null =
      typeof body.clientId === "string" ? body.clientId : null;
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
      where: { type: options.testType }
    });

    if (!test) {
      return NextResponse.json(
        { message: options.testNotFoundMessage },
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
        const baseUrlForNotif =
          process.env.NEXTAUTH_URL ??
          process.env.NEXT_PUBLIC_APP_URL ??
          "http://localhost:3000";
        const diagnosticUrl = `${baseUrlForNotif}/diagnostics/${link.token}`;
        await prisma.notification.create({
          data: {
            userId: client.userId,
            title: "Психолог отправил вам тест",
            body: `Вам назначен тест «${test.title}». Пройдите его в личном кабинете или по ссылке: ${diagnosticUrl}`
          }
        });
      }
    }

    const baseUrl =
      process.env.NEXTAUTH_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000";

    const url = `${baseUrl}/diagnostics/${link.token}`;

    await safeLogAudit({
      action: "DIAGNOSTIC_LINK_CREATE",
      actorUserId: userId,
      actorRole: psychAuth.role,
      targetType: "DiagnosticLink",
      targetId: link.id,
      ip,
      meta: {
        testType: options.testType,
        clientId,
        maxUses
      }
    });

    if (clientId) {
      await safeLogClientHistory({
        clientId,
        type: ClientHistoryType.DIAGNOSTIC_LINK_CREATED,
        actorUserId: userId,
        meta: { testType: options.testType, linkId: link.id, maxUses }
      });
    }

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
}
