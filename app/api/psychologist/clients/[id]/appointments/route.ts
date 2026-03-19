import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

type ParamsPromise = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_req: Request, { params }: ParamsPromise) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const role = (session?.user as unknown as { role?: string | null } | null)?.role;
  if (!session?.user || role !== "PSYCHOLOGIST") {
    return NextResponse.json({ message: "Доступ запрещён" }, { status: 403 });
  }

  const userId = (session.user as unknown as { id?: string | null }).id;
  if (!userId) {
    return NextResponse.json({ message: "Сессия недействительна" }, { status: 401 });
  }

  const psych = await prisma.psychologistProfile.findUnique({
    where: { userId },
    select: { id: true }
  });

  if (!psych) {
    return NextResponse.json(
      { message: "Профиль психолога не найден" },
      { status: 400 }
    );
  }

  const client = await prisma.clientProfile.findFirst({
    where: {
      id,
      psychologistId: psych.id
    },
    select: { id: true }
  });

  if (!client) {
    return NextResponse.json({ message: "Клиент не найден" }, { status: 404 });
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      psychologistId: psych.id,
      clientId: client.id
    },
    orderBy: {
      start: "desc"
    }
  });

  return NextResponse.json(
    appointments.map(a => ({
      id: a.id,
      start: a.start.toISOString(),
      end: a.end.toISOString(),
      status: a.status,
      proposedByPsychologist:
        typeof a.notes === "string" &&
        a.notes.includes("PROPOSED_BY_PSYCHOLOGIST")
    }))
  );
}

export async function POST(request: Request, { params }: ParamsPromise) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    const role = (session?.user as unknown as { role?: string | null } | null)?.role;
    if (!session?.user || role !== "PSYCHOLOGIST") {
      return NextResponse.json({ message: "Доступ запрещён" }, { status: 403 });
    }

    const userId = (session.user as unknown as { id?: string | null }).id;
    if (!userId) {
      return NextResponse.json({ message: "Сессия недействительна" }, { status: 401 });
    }

    const psych = await prisma.psychologistProfile.findUnique({
      where: { userId }
    });

    if (!psych) {
      return NextResponse.json(
        { message: "Профиль психолога не найден" },
        { status: 400 }
      );
    }

    const client = await prisma.clientProfile.findFirst({
      where: {
        id,
        psychologistId: psych.id
      },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true
      }
    });

    if (!client) {
      return NextResponse.json({ message: "Клиент не найден" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const startIso = body?.start as string | undefined;
    const durationMinutes = Number(body?.durationMinutes ?? 0);

    if (!startIso || Number.isNaN(durationMinutes) || durationMinutes <= 0) {
      return NextResponse.json(
        { message: "Укажите дату и длительность приёма" },
        { status: 400 }
      );
    }

    const start = new Date(startIso);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    const hasAccount = !!client.userId;
    const result = await prisma.$transaction(async tx => {
      const slot = await tx.scheduleSlot.create({
        data: {
          psychologistId: psych.id,
          start,
          end,
          status: "BOOKED"
        }
      });

      const appointment = await tx.appointment.create({
        data: {
          slotId: slot.id,
          psychologistId: psych.id,
          clientId: client.id,
          start,
          end,
          status: hasAccount ? "PENDING_CONFIRMATION" : "SCHEDULED",
          notes: hasAccount ? "PROPOSED_BY_PSYCHOLOGIST" : null
        }
      });

      if (hasAccount) {
        const dateStr = start.toLocaleString("ru-RU", {
          dateStyle: "short",
          timeStyle: "short"
        });
        const psychologistName = `${psych.lastName} ${psych.firstName}`.trim() || "Психолог";
        await tx.notification.create({
          data: {
            userId: client.userId!,
            title: "Предложена запись на приём",
            body: `Психолог ${psychologistName} предложил(а) вам запись на приём ${dateStr}. Подтвердите или отмените её в личном кабинете.`
          }
        });
      }

      return appointment;
    });

    return NextResponse.json(
      {
        id: result.id,
        start: result.start.toISOString(),
        end: result.end.toISOString(),
        status: result.status,
        proposedByPsychologist: hasAccount
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create appointment for client error", error);
    return NextResponse.json(
      { message: "Не удалось создать запись" },
      { status: 400 }
    );
  }
}

