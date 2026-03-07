import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Не авторизован" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        image: true,
        role: true
      }
    });
    if (!user) {
      return NextResponse.json({ message: "Пользователь не найден" }, { status: 404 });
    }

    let dateOfBirthStr: string | null = null;
    try {
      const row = await prisma.user.findUnique({
        where: { id: userId },
        select: { dateOfBirth: true }
      });
      if (row?.dateOfBirth) dateOfBirthStr = row.dateOfBirth.toISOString().slice(0, 10);
    } catch {
      dateOfBirthStr = null;
    }

    let psychologistProfile: { firstName: string; lastName: string; phone: string | null; bio: string | null } | null = null;
    if ((session.user as { role?: string }).role === "PSYCHOLOGIST") {
      const profile = await prisma.psychologistProfile.findUnique({
        where: { userId },
        select: { firstName: true, lastName: true, phone: true, bio: true }
      });
      if (profile) psychologistProfile = profile;
    }

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        image: user.image,
        dateOfBirth: dateOfBirthStr,
        role: user.role
      },
      psychologistProfile
    });
  } catch (err) {
    console.error("[GET /api/user/profile]", err);
    return NextResponse.json(
      { message: "Ошибка загрузки профиля" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Не авторизован" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const role = (session.user as { role?: string }).role;
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Неверный JSON" }, { status: 400 });
    }

    let dateOfBirthValue: Date | null | undefined;
    if (body.dateOfBirth === null || body.dateOfBirth === "") {
      dateOfBirthValue = null;
    } else if (typeof body.dateOfBirth === "string") {
      const d = new Date(body.dateOfBirth);
      dateOfBirthValue = Number.isNaN(d.getTime()) ? undefined : d;
    } else {
      dateOfBirthValue = undefined;
    }

    let displayName: string | undefined;
    if (role === "PSYCHOLOGIST") {
      const profileUpdates: { firstName?: string; lastName?: string; phone?: string | null; bio?: string | null } = {};
      if (typeof body.firstName === "string") profileUpdates.firstName = body.firstName;
      if (typeof body.lastName === "string") profileUpdates.lastName = body.lastName;
      if (body.phone !== undefined) profileUpdates.phone = body.phone === null || body.phone === "" ? null : String(body.phone);
      if (body.bio !== undefined) profileUpdates.bio = body.bio === null ? null : String(body.bio);
      if (Object.keys(profileUpdates).length > 0) {
        const updated = await prisma.psychologistProfile.upsert({
          where: { userId },
          create: {
            userId,
            firstName: profileUpdates.firstName ?? (session.user as { name?: string }).name ?? "Психолог",
            lastName: profileUpdates.lastName ?? "",
            phone: profileUpdates.phone ?? null,
            bio: profileUpdates.bio ?? null
          },
          update: profileUpdates
        });
        const joined = [updated.firstName, updated.lastName].filter(Boolean).join(" ").trim();
        if (joined) displayName = joined;
      }
    }

    const userData: { name?: string; dateOfBirth?: Date | null; email?: string; emailVerified?: null } = {};
    if (typeof body.name === "string") userData.name = body.name;
    if (displayName) userData.name = displayName;
    if (dateOfBirthValue !== undefined) userData.dateOfBirth = dateOfBirthValue;

    if (typeof body.email === "string") {
      const email = body.email.trim().toLowerCase();
      if (!email.includes("@") || !email.includes(".") || email.length < 5) {
        return NextResponse.json(
          { message: "Укажите корректный email" },
          { status: 400 }
        );
      }
      const existing = await prisma.user.findFirst({
        where: { email, id: { not: userId } },
        select: { id: true }
      });
      if (existing) {
        return NextResponse.json(
          { message: "Этот email уже используется" },
          { status: 400 }
        );
      }
      userData.email = email;
      userData.emailVerified = null;
    }

    if (Object.keys(userData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: userData
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/user/profile]", err);
    return NextResponse.json(
      { message: "Ошибка сохранения профиля" },
      { status: 500 }
    );
  }
}
