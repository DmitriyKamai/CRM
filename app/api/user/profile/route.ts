import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Максимум символов в блоке «О себе» профессионального профиля */
const BIO_MAX_LENGTH = 1500;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Не авторизован" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ message: "Сессия недействительна" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        image: true,
        role: true,
        dateOfBirth: true,
        phone: true,
        country: true,
        city: true,
        gender: true,
        maritalStatus: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { message: "Пользователь не найден. Войдите снова." },
        { status: 401 }
      );
    }

    const dateOfBirthStr = user.dateOfBirth
      ? user.dateOfBirth.toISOString().slice(0, 10)
      : null;

    let psychologistProfile: {
      firstName: string;
      lastName: string;
      phone: string | null;
      country: string | null;
      city: string | null;
      gender: string | null;
      maritalStatus: string | null;
      specialization: string | null;
      bio: string | null;
      profilePhotoUrl: string | null;
      profilePhotoPublished: boolean;
    } | null = null;
    if ((session.user as { role?: string }).role === "PSYCHOLOGIST") {
      const profile = await prisma.psychologistProfile.findUnique({
        where: { userId },
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          country: true,
          city: true,
          gender: true,
          maritalStatus: true,
          specialization: true,
          bio: true,
          profilePhotoUrl: true,
          profilePhotoPublished: true
        }
      });
      psychologistProfile = profile
        ? profile
        : {
            firstName: "",
            lastName: "",
            phone: null,
            country: null,
            city: null,
            gender: null,
            maritalStatus: null,
            specialization: null,
            bio: null,
            profilePhotoUrl: null,
            profilePhotoPublished: false
          };
    }

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        image: user.image,
        dateOfBirth: dateOfBirthStr,
        role: user.role,
        phone: user.phone,
        country: user.country,
        city: user.city,
        gender: user.gender,
        maritalStatus: user.maritalStatus
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
      const profileUpdates: {
        firstName?: string;
        lastName?: string;
        phone?: string | null;
        country?: string | null;
        city?: string | null;
        gender?: string | null;
        maritalStatus?: string | null;
        specialization?: string | null;
        bio?: string | null;
        profilePhotoPublished?: boolean;
      } = {};
      if (typeof body.firstName === "string") profileUpdates.firstName = body.firstName;
      if (typeof body.lastName === "string") profileUpdates.lastName = body.lastName;
      if (body.phone !== undefined) profileUpdates.phone = body.phone === null || body.phone === "" ? null : String(body.phone);
      if (body.country !== undefined) profileUpdates.country = body.country === null || body.country === "" ? null : String(body.country);
      if (body.city !== undefined) profileUpdates.city = body.city === null || body.city === "" ? null : String(body.city);
      if (body.gender !== undefined) profileUpdates.gender = body.gender === null || body.gender === "" ? null : String(body.gender);
      if (body.maritalStatus !== undefined) profileUpdates.maritalStatus = body.maritalStatus === null || body.maritalStatus === "" ? null : String(body.maritalStatus);
      if (body.specialization !== undefined) profileUpdates.specialization = body.specialization === null || body.specialization === "" ? null : String(body.specialization);
      if (body.bio !== undefined) profileUpdates.bio = body.bio === null ? null : String(body.bio).slice(0, BIO_MAX_LENGTH);
      if (typeof body.profilePhotoPublished === "boolean") profileUpdates.profilePhotoPublished = body.profilePhotoPublished;
      if (Object.keys(profileUpdates).length > 0) {
        const updated = await prisma.psychologistProfile.upsert({
          where: { userId },
          create: {
            userId,
            firstName: profileUpdates.firstName ?? (session.user as { name?: string }).name ?? "Психолог",
            lastName: profileUpdates.lastName ?? "",
            phone: profileUpdates.phone ?? null,
            country: profileUpdates.country ?? null,
            city: profileUpdates.city ?? null,
            gender: profileUpdates.gender ?? null,
            maritalStatus: profileUpdates.maritalStatus ?? null,
            specialization: profileUpdates.specialization ?? null,
            bio: profileUpdates.bio ?? null
          },
          update: profileUpdates
        });
        const joined = [updated.firstName, updated.lastName].filter(Boolean).join(" ").trim();
        if (joined) displayName = joined;
      }
    }

    const userData: {
      name?: string | null;
      dateOfBirth?: Date | null;
      email?: string;
      emailVerified?: null;
      phone?: string | null;
      country?: string | null;
      city?: string | null;
      gender?: string | null;
      maritalStatus?: string | null;
    } = {};
    if (role === "PSYCHOLOGIST" && displayName) {
      userData.name = displayName;
    } else if (body.name !== undefined) {
      userData.name = body.name === null || body.name === "" ? null : String(body.name);
    }
    if (dateOfBirthValue !== undefined) userData.dateOfBirth = dateOfBirthValue;
    if (body.phone !== undefined) userData.phone = body.phone === null || body.phone === "" ? null : String(body.phone);
    if (body.country !== undefined) userData.country = body.country === null || body.country === "" ? null : String(body.country);
    if (body.city !== undefined) userData.city = body.city === null || body.city === "" ? null : String(body.city);
    if (body.gender !== undefined) userData.gender = body.gender === null || body.gender === "" ? null : String(body.gender);
    if (body.maritalStatus !== undefined) userData.maritalStatus = body.maritalStatus === null || body.maritalStatus === "" ? null : String(body.maritalStatus);

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

    // Клиент: синхронизируем личные данные во все профили клиента у психологов
    if (role === "CLIENT") {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, dateOfBirth: true, phone: true, country: true, city: true, gender: true, maritalStatus: true }
      });
      if (user) {
        const parts = (user.name ?? "").trim().split(/\s+/).filter(Boolean);
        const firstName = parts.length > 0 ? parts[0]! : "";
        const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
        await prisma.clientProfile.updateMany({
          where: { userId },
          data: {
            ...(firstName !== "" && { firstName }),
            ...(firstName !== "" && { lastName }),
            ...(user.email && { email: user.email }),
            dateOfBirth: user.dateOfBirth,
            phone: user.phone,
            country: user.country,
            city: user.city,
            gender: user.gender,
            maritalStatus: user.maritalStatus
          }
        });
      }
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
