import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getPlatformModuleFlags } from "@/lib/platform-modules";
import { withPrismaLock } from "@/lib/prisma-request-lock";
import { requireClient } from "@/lib/security/api-guards";

async function handleGet(): Promise<Response> {
  return withPrismaLock(async () => {
  try {
    const clientCtx = await requireClient();
    if (!clientCtx.ok) return clientCtx.response;
    const userId = clientCtx.userId;
    const session = clientCtx.session;

    let clientProfiles: { id: string; firstName: string; lastName: string }[];
    try {
      clientProfiles = await prisma.clientProfile.findMany({
        where: { userId },
        select: { id: true, firstName: true, lastName: true }
      });
    } catch (dbErr) {
      console.error("[API /api/client/dashboard] prisma findMany:", dbErr);
      return NextResponse.json(
        {
          error:
            dbErr instanceof Error
              ? dbErr.message
              : "Ошибка подключения к базе данных"
        },
        { status: 500 }
      );
    }

    const clientIds = clientProfiles.map((c) => c.id);
    const modules = await getPlatformModuleFlags();

    let upcomingAppointmentsList: Array<{
      id: string;
      start: string;
      end: string;
      psychologistName: string;
      status: "PENDING_CONFIRMATION" | "SCHEDULED";
      proposedByPsychologist?: boolean;
    }> = [];
    let upcomingAppointments = 0;
    let testResults = 0;
    let diagnosticResults: Array<{
      id: string;
      testTitle: string;
      createdAt: string;
      interpretation?: string | null;
    }> = [];
    let pendingDiagnosticLinks: Array<{
      id: string;
      token: string;
      testTitle: string;
      psychologistName: string;
      createdAt: string;
      hasProgress: boolean;
    }> = [];
    let recommendations: Array<{
      id: string;
      title: string;
      body: string;
      createdAt: string;
      psychologistName: string;
    }> = [];

    if (clientIds.length > 0) {
      try {
        if (modules.scheduling) {
          const now = new Date();
          const appointments = await prisma.appointment.findMany({
            where: {
              clientId: { in: clientIds },
              start: { gte: now },
              status: { in: ["SCHEDULED", "PENDING_CONFIRMATION"] }
            },
            include: {
              psychologist: {
                select: { firstName: true, lastName: true }
              }
            },
            orderBy: { start: "asc" },
            take: 20
          });
          upcomingAppointments = appointments.length;
          upcomingAppointmentsList = appointments.map((a) => ({
            id: a.id,
            start: a.start.toISOString(),
            end: a.end.toISOString(),
            psychologistName: `${a.psychologist.lastName} ${a.psychologist.firstName}`.trim(),
            status: a.status as "PENDING_CONFIRMATION" | "SCHEDULED",
            proposedByPsychologist:
              typeof a.notes === "string" &&
              a.notes.includes("PROPOSED_BY_PSYCHOLOGIST")
          }));
        }

        if (modules.diagnostics) {
          const results = await prisma.testResult.findMany({
            where: { clientId: { in: clientIds } },
            include: {
              test: {
                select: { title: true }
              }
            },
            orderBy: { createdAt: "desc" },
            take: 20
          });
          testResults = results.length;
          diagnosticResults = results.map((r) => ({
            id: r.id,
            testTitle: r.test.title,
            createdAt: r.createdAt.toISOString(),
            interpretation: r.interpretation
          }));

          const pendingLinksRaw = await prisma.diagnosticLink.findMany({
            where: { clientId: { in: clientIds } },
            include: {
              test: { select: { title: true } },
              psychologist: {
                select: { firstName: true, lastName: true }
              }
            },
            orderBy: { createdAt: "desc" },
            take: 50
          });
          const pendingLinksFiltered = pendingLinksRaw.filter((l) => {
            if (l.expiresAt && l.expiresAt <= new Date()) return false;
            if (l.maxUses != null && (l.usedCount ?? 0) >= l.maxUses) return false;
            return true;
          });
          const linkIds = pendingLinksFiltered.slice(0, 20).map((l) => l.id);
          let progressByLinkId = new Map<string, number>();
          try {
            const prismaWithDiagnosticProgress = prisma as unknown as {
              diagnosticProgress: {
                findMany: (
                  args: unknown
                ) => Promise<Array<{ diagnosticLinkId: string; currentStep: number }>>;
              };
            };
            const progressList = await prismaWithDiagnosticProgress.diagnosticProgress.findMany({
              where: { diagnosticLinkId: { in: linkIds } },
              select: { diagnosticLinkId: true, currentStep: true }
            });
            progressByLinkId = new Map(
              progressList.map((p) => [p.diagnosticLinkId, p.currentStep])
            );
          } catch {
            // DiagnosticProgress table may not exist yet
          }
          pendingDiagnosticLinks = pendingLinksFiltered.slice(0, 20).map((l) => {
            const currentStep = progressByLinkId.get(l.id) ?? 0;
            return {
              id: l.id,
              token: l.token,
              testTitle: l.test.title,
              psychologistName:
                `${l.psychologist?.lastName ?? ""} ${l.psychologist?.firstName ?? ""}`.trim() ||
                "Психолог",
              createdAt: l.createdAt.toISOString(),
              hasProgress: currentStep > 0
            };
          });
        }

        const recs = await prisma.recommendation.findMany({
          where: { clientId: { in: clientIds } },
          include: {
            psychologist: {
              select: { firstName: true, lastName: true }
            }
          },
          orderBy: { createdAt: "desc" },
          take: 20
        });
        recommendations = recs.map((r) => ({
          id: r.id,
          title: r.title,
          body: r.body,
          createdAt: r.createdAt.toISOString(),
          psychologistName: `${r.psychologist.lastName} ${r.psychologist.firstName}`.trim()
        }));
      } catch (countErr) {
        console.error("[API /api/client/dashboard] prisma:", countErr);
      }
    }

    const name =
      clientProfiles.length > 0
        ? `${clientProfiles[0].lastName} ${clientProfiles[0].firstName}`
        : (session.user as { name?: string | null }).name ?? session.user?.email ?? "Клиент";

    return NextResponse.json({
      name,
      upcomingAppointments,
      upcomingAppointmentsList,
      testResults,
      diagnosticResults,
      pendingDiagnosticLinks,
      recommendations
    });
  } catch (err) {
    console.error("[API /api/client/dashboard] error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Ошибка загрузки данных"
      },
      { status: 500 }
    );
  }
  });
}

export async function GET() {
  return handleGet().catch((err) => {
    console.error("[API /api/client/dashboard] unhandled:", err);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  });
}
