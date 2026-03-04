import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withPrismaLock } from "@/lib/prisma-request-lock";

async function handleGet(): Promise<Response> {
  return withPrismaLock(async () => {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("[API /api/client/dashboard] getServerSession:", sessionErr);
      return NextResponse.json(
        { error: "Ошибка проверки сессии" },
        { status: 500 }
      );
    }

    if (!session?.user) {
      return NextResponse.json(
        { error: "unauthorized" },
        { status: 401 }
      );
    }

    if ((session.user as any).role !== "CLIENT") {
      return NextResponse.json(
        { error: "forbidden" },
        { status: 403 }
      );
    }

    const userId = (session.user as any).id as string | undefined;
    if (!userId) {
      return NextResponse.json(
        { error: "unauthorized" },
        { status: 401 }
      );
    }

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
    let recommendations: Array<{
      id: string;
      title: string;
      body: string;
      createdAt: string;
      psychologistName: string;
    }> = [];

    if (clientIds.length > 0) {
      try {
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
