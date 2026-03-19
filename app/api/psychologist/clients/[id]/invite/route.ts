import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendRegistrationInviteEmail } from "@/lib/email";

type ParamsPromise = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: ParamsPromise) {
  try {
    const { id: clientId } = await params;
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
      select: { id: true, firstName: true, lastName: true }
    });

    if (!psych) {
      return NextResponse.json(
        { message: "Профиль психолога не найден" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const emailFromBody =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    const client = await prisma.clientProfile.findFirst({
      where: {
        id: clientId,
        psychologistId: psych.id
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        userId: true
      }
    });

    if (!client) {
      return NextResponse.json({ message: "Клиент не найден" }, { status: 404 });
    }

    if (client.userId) {
      return NextResponse.json(
        { message: "Клиент уже зарегистрирован" },
        { status: 400 }
      );
    }

    const targetEmail = (emailFromBody || client.email || "").trim().toLowerCase();
    if (!targetEmail) {
      return NextResponse.json(
        { message: "Email клиента не указан" },
        { status: 400 }
      );
    }

    const token = crypto.randomUUID();

    await prisma.clientRegistrationInvite.upsert({
      where: {
        // один активный инвайт на клиента
        clientId_psychologistId: {
          clientId: client.id,
          psychologistId: psych.id
        }
      },
      update: {
        token,
        email: targetEmail,
        usedAt: null
      },
      create: {
        token,
        clientId: client.id,
        psychologistId: psych.id,
        email: targetEmail
      }
    });

    const baseUrl =
      process.env.NEXTAUTH_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000";
    const inviteUrl = `${baseUrl}/auth/register/client?invite=${encodeURIComponent(
      token
    )}`;

    await sendRegistrationInviteEmail({
      to: targetEmail,
      clientName: `${client.firstName} ${client.lastName}`.trim(),
      psychologistName: `${psych.lastName ?? ""} ${psych.firstName ?? ""}`.trim() ||
        "ваш психолог",
      inviteUrl
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/psychologist/clients/[id]/invite]", err);
    return NextResponse.json(
      { message: "Не удалось отправить приглашение" },
      { status: 500 }
    );
  }
}

