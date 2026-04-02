import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireAuth, sessionInvalidResponse } from "@/lib/security/api-guards";
import { BIO_MAX_LENGTH } from "@/lib/settings/professional-profile";
const MAX_EMAIL_LENGTH = 64;
const MAX_NAME_LENGTH = 64;
const MAX_FIRST_NAME_LENGTH = 32;
const MAX_LAST_NAME_LENGTH = 32;
const MAX_PHONE_LENGTH = 32;
const MAX_COUNTRY_LENGTH = 64;
const MAX_CITY_LENGTH = 64;
const MAX_SPECIALIZATION_LENGTH = 64;
const MAX_CONTACT_LINK_LENGTH = 128;

export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;
    const userId = auth.userId;
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
      return sessionInvalidResponse("Пользователь не найден. Войдите снова.");
    }

    const dateOfBirthStr = user.dateOfBirth
      ? user.dateOfBirth.toISOString().slice(0, 10)
      : null;

    type PsychologistProfileDTO = {
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
      contactPhone: string | null;
      contactTelegram: string | null;
      contactViber: string | null;
      contactWhatsapp: string | null;
    };

    let psychologistProfile: PsychologistProfileDTO | null = null;
    if (auth.user.role === "PSYCHOLOGIST") {
      const profile = await prisma.psychologistProfile.findUnique({
        where: { userId }
      });
      if (!profile) {
        return sessionInvalidResponse(
          "Сессия недействительна: профиль специалиста не найден. Войдите снова."
        );
      }
      const p = profile;
      psychologistProfile = {
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone ?? null,
        country: p.country ?? null,
        city: p.city ?? null,
        gender: p.gender ?? null,
        maritalStatus: p.maritalStatus ?? null,
        specialization: p.specialization ?? null,
        bio: p.bio ?? null,
        profilePhotoUrl: p.profilePhotoUrl ?? null,
        profilePhotoPublished: p.profilePhotoPublished ?? false,
        contactPhone: p.contactPhone ?? null,
        contactTelegram: p.contactTelegram ?? null,
        contactViber: p.contactViber ?? null,
        contactWhatsapp: p.contactWhatsapp ?? null
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
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;
    const userId = auth.userId;
    const role = auth.user.role;
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
        profilePhotoPublished?: boolean; // в теле допускается и legacy-ключ profilePublished
        contactPhone?: string | null;
        contactTelegram?: string | null;
        contactViber?: string | null;
        contactWhatsapp?: string | null;
      } = {};
      if (typeof body.firstName === "string") {
        const v = body.firstName.trim().slice(0, MAX_FIRST_NAME_LENGTH);
        profileUpdates.firstName = v;
      }
      if (typeof body.lastName === "string") {
        const v = body.lastName.trim().slice(0, MAX_LAST_NAME_LENGTH);
        profileUpdates.lastName = v;
      }
      if (body.phone !== undefined) {
        const raw = body.phone === null || body.phone === "" ? null : String(body.phone);
        profileUpdates.phone =
          raw === null ? null : raw.trim().slice(0, MAX_PHONE_LENGTH);
      }
      if (body.country !== undefined) {
        const raw = body.country === null || body.country === "" ? null : String(body.country);
        profileUpdates.country =
          raw === null ? null : raw.trim().slice(0, MAX_COUNTRY_LENGTH);
      }
      if (body.city !== undefined) {
        const raw = body.city === null || body.city === "" ? null : String(body.city);
        profileUpdates.city =
          raw === null ? null : raw.trim().slice(0, MAX_CITY_LENGTH);
      }
      if (body.gender !== undefined) profileUpdates.gender = body.gender === null || body.gender === "" ? null : String(body.gender);
      if (body.maritalStatus !== undefined) profileUpdates.maritalStatus = body.maritalStatus === null || body.maritalStatus === "" ? null : String(body.maritalStatus);
      if (body.specialization !== undefined) {
        const raw =
          body.specialization === null || body.specialization === ""
            ? null
            : String(body.specialization);
        profileUpdates.specialization =
          raw === null ? null : raw.trim().slice(0, MAX_SPECIALIZATION_LENGTH);
      }
      if (body.contactPhone !== undefined) {
        const raw =
          body.contactPhone === null || body.contactPhone === ""
            ? null
            : String(body.contactPhone);
        profileUpdates.contactPhone =
          raw === null ? null : raw.trim().slice(0, MAX_PHONE_LENGTH);
      }
      if (body.contactTelegram !== undefined) {
        const raw =
          body.contactTelegram === null || body.contactTelegram === ""
            ? null
            : String(body.contactTelegram);
        profileUpdates.contactTelegram =
          raw === null ? null : raw.trim().slice(0, MAX_CONTACT_LINK_LENGTH);
      }
      if (body.contactViber !== undefined) {
        const raw =
          body.contactViber === null || body.contactViber === ""
            ? null
            : String(body.contactViber);
        profileUpdates.contactViber =
          raw === null ? null : raw.trim().slice(0, MAX_CONTACT_LINK_LENGTH);
      }
      if (body.contactWhatsapp !== undefined) {
        const raw =
          body.contactWhatsapp === null || body.contactWhatsapp === ""
            ? null
            : String(body.contactWhatsapp);
        profileUpdates.contactWhatsapp =
          raw === null ? null : raw.trim().slice(0, MAX_CONTACT_LINK_LENGTH);
      }
      if (body.bio !== undefined) profileUpdates.bio = body.bio === null ? null : String(body.bio).slice(0, BIO_MAX_LENGTH);
      const published =
        typeof body.profilePhotoPublished === "boolean"
          ? body.profilePhotoPublished
          : typeof body.profilePublished === "boolean"
            ? body.profilePublished
            : undefined;
      if (published !== undefined)
        profileUpdates.profilePhotoPublished = published;
      if (Object.keys(profileUpdates).length > 0) {
        const updated = await prisma.psychologistProfile.upsert({
          where: { userId },
          create: {
            userId,
            firstName: profileUpdates.firstName ?? (auth.session.user as { name?: string }).name ?? "Психолог",
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
      userData.name = displayName.slice(0, MAX_NAME_LENGTH);
    } else if (body.name !== undefined) {
      if (body.name === null || body.name === "") {
        userData.name = null;
      } else {
        const v = String(body.name).trim().slice(0, MAX_NAME_LENGTH);
        userData.name = v.length === 0 ? null : v;
      }
    }
    if (dateOfBirthValue !== undefined) userData.dateOfBirth = dateOfBirthValue;
  if (body.phone !== undefined) {
      const raw = body.phone === null || body.phone === "" ? null : String(body.phone);
      userData.phone =
        raw === null ? null : raw.trim().slice(0, MAX_PHONE_LENGTH);
  }
  if (body.country !== undefined) {
      const raw = body.country === null || body.country === "" ? null : String(body.country);
      userData.country =
        raw === null ? null : raw.trim().slice(0, MAX_COUNTRY_LENGTH);
  }
  if (body.city !== undefined) {
      const raw = body.city === null || body.city === "" ? null : String(body.city);
      userData.city =
        raw === null ? null : raw.trim().slice(0, MAX_CITY_LENGTH);
  }
    if (body.gender !== undefined) userData.gender = body.gender === null || body.gender === "" ? null : String(body.gender);
    if (body.maritalStatus !== undefined) userData.maritalStatus = body.maritalStatus === null || body.maritalStatus === "" ? null : String(body.maritalStatus);

    if (typeof body.email === "string") {
      const email = body.email.trim().toLowerCase();
      if (!email.includes("@") || !email.includes(".") || email.length < 5 || email.length > MAX_EMAIL_LENGTH) {
        return NextResponse.json(
          { message: "Укажите корректный email (не более 64 символов)" },
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
