import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

type ParamsPromise = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: ParamsPromise) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== "CLIENT") {
      return NextResponse.json({ message: "Доступ запрещён" }, { status: 403 });
    }

    const userId = (session.user as any).id as string;

    const body = await request.json().catch(() => null);
    const status = body?.status as
      | "PENDING_CONFIRMATION"
      | "SCHEDULED"
      | "COMPLETED"
      | "CANCELED"
      | undefined;

    if (!status) {
      return NextResponse.json(
        { message: "Не указан новый статус" },
        { status: 400 }
      );
    }

    const appt = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            userId: true
          }
        }
      }
    });

    if (!appt || !appt.client || appt.client.userId !== userId) {
      return NextResponse.json(
        { message: "Запись не найдена" },
        { status: 404 }
      );
    }

    const proposedByPsychologist =
      typeof appt.notes === "string" &&
      appt.notes.includes("PROPOSED_BY_PSYCHOLOGIST");

    // Клиент может:
    // - подтвердить только предложенную психологом запись (PENDING_CONFIRMATION -> SCHEDULED)
    // - отменить свою будущую запись (PENDING_CONFIRMATION или SCHEDULED -> CANCELED)
    if (status === "SCHEDULED") {
      if (
        appt.status !== "PENDING_CONFIRMATION" ||
        !proposedByPsychologist
      ) {
        return NextResponse.json(
          { message: "Эту запись нельзя подтвердить клиенту" },
          { status: 400 }
        );
      }
    } else if (status === "CANCELED") {
      if (
        appt.status !== "PENDING_CONFIRMATION" &&
        appt.status !== "SCHEDULED"
      ) {
        return NextResponse.json(
          { message: "Эту запись нельзя отменить" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { message: "Недопустимый статус для изменения клиентом" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async tx => {
      const slotIdToFree = appt.slotId;

      const updated = await tx.appointment.update({
        where: { id: appt.id },
        data:
          status === "CANCELED"
            ? { status: "CANCELED", slotId: null }
            : { status }
      });

      if (status === "CANCELED" && slotIdToFree) {
        await tx.scheduleSlot.update({
          where: { id: slotIdToFree },
          data: { status: "FREE" }
        });
      }

      return updated;
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[PATCH /api/client/appointments/[id]]", err);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

