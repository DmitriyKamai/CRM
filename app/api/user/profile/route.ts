import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireAuth, sessionInvalidResponse } from "@/lib/security/api-guards";
import { BIO_MAX_LENGTH } from "@/lib/settings/professional-profile";
import {
  normalizePublicSlugInput,
  validatePublicSlug
} from "@/lib/settings/public-profile-slug";

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
        firstName: true,
        lastName: true,
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
      id: string;
      specialization: string | null;
      bio: string | null;
      profilePhotoUrl: string | null;
      publicSlug: string | null;
      profilePagePublished: boolean;
      catalogVisible: boolean;
      practiceCountry: string | null;
      practiceCity: string | null;
      worksOnline: boolean;
      contactPhone: string | null;
      contactTelegram: string | null;
      contactViber: string | null;
      contactWhatsapp: string | null;
    };

    let psychologistProfile: PsychologistProfileDTO | null = null;
    if (auth.user.role === "PSYCHOLOGIST") {
      const profile = await prisma.psychologistProfile.findUnique({
        where: { userId },
        select: {
          id: true,
          specialization: true,
          bio: true,
          profilePhotoUrl: true,
          publicSlug: true,
          profilePagePublished: true,
          catalogVisible: true,
          practiceCountry: true,
          practiceCity: true,
          worksOnline: true,
          contactPhone: true,
          contactTelegram: true,
          contactViber: true,
          contactWhatsapp: true
        }
      });
      if (!profile) {
        return sessionInvalidResponse(
          "Сессия недействительна: профиль специалиста не найден. Войдите снова."
        );
      }
      psychologistProfile = {
        id: profile.id,
        specialization: profile.specialization ?? null,
        bio: profile.bio ?? null,
        profilePhotoUrl: profile.profilePhotoUrl ?? null,
        publicSlug: profile.publicSlug ?? null,
        profilePagePublished: profile.profilePagePublished ?? false,
        catalogVisible: profile.catalogVisible ?? false,
        practiceCountry: profile.practiceCountry ?? null,
        practiceCity: profile.practiceCity ?? null,
        worksOnline: profile.worksOnline ?? false,
        contactPhone: profile.contactPhone ?? null,
        contactTelegram: profile.contactTelegram ?? null,
        contactViber: profile.contactViber ?? null,
        contactWhatsapp: profile.contactWhatsapp ?? null
      };
    }

    return NextResponse.json({
      user: {
        name: user.name,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        email: user.email,
        image: user.image,
        dateOfBirth: dateOfBirthStr,
        role: user.role,
        phone: user.phone ?? null,
        country: user.country ?? null,
        city: user.city ?? null,
        gender: user.gender ?? null,
        maritalStatus: user.maritalStatus ?? null
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

    // --- Профессиональные поля только для психолога ---
    if (role === "PSYCHOLOGIST") {
      const profileUpdates: {
        specialization?: string | null;
        bio?: string | null;
        contactPhone?: string | null;
        contactTelegram?: string | null;
        contactViber?: string | null;
        contactWhatsapp?: string | null;
        publicSlug?: string | null;
        profilePagePublished?: boolean;
        catalogVisible?: boolean;
        practiceCountry?: string | null;
        practiceCity?: string | null;
        worksOnline?: boolean;
      } = {};

      if (body.specialization !== undefined) {
        const raw =
          body.specialization === null || body.specialization === ""
            ? null
            : String(body.specialization);
        profileUpdates.specialization =
          raw === null ? null : raw.trim().slice(0, MAX_SPECIALIZATION_LENGTH);
      }
      if (body.bio !== undefined) {
        profileUpdates.bio =
          body.bio === null ? null : String(body.bio).slice(0, BIO_MAX_LENGTH);
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

      if (body.publicSlug !== undefined) {
        if (body.publicSlug === null || body.publicSlug === "") {
          profileUpdates.publicSlug = null;
        } else {
          const normalized = normalizePublicSlugInput(String(body.publicSlug));
          const checked = validatePublicSlug(normalized);
          if (!checked.ok) {
            return NextResponse.json({ message: checked.message }, { status: 400 });
          }
          profileUpdates.publicSlug = checked.slug;
        }
      }

      if (typeof body.profilePagePublished === "boolean") {
        profileUpdates.profilePagePublished = body.profilePagePublished;
      }
      if (typeof body.catalogVisible === "boolean") {
        profileUpdates.catalogVisible = body.catalogVisible;
      }
      /** @deprecated старый единый флаг — страница и каталог вместе */
      if (typeof body.profilePhotoPublished === "boolean") {
        profileUpdates.profilePagePublished = body.profilePhotoPublished;
        profileUpdates.catalogVisible = body.profilePhotoPublished;
      }
      if (typeof body.profilePublished === "boolean") {
        profileUpdates.profilePagePublished = body.profilePublished;
      }

      if (body.practiceCountry !== undefined) {
        const raw =
          body.practiceCountry === null || body.practiceCountry === ""
            ? null
            : String(body.practiceCountry);
        profileUpdates.practiceCountry =
          raw === null ? null : raw.trim().slice(0, MAX_COUNTRY_LENGTH);
      }
      if (body.practiceCity !== undefined) {
        const raw =
          body.practiceCity === null || body.practiceCity === ""
            ? null
            : String(body.practiceCity);
        profileUpdates.practiceCity =
          raw === null ? null : raw.trim().slice(0, MAX_CITY_LENGTH);
      }
      if (typeof body.worksOnline === "boolean") {
        profileUpdates.worksOnline = body.worksOnline;
      }

      if (Object.keys(profileUpdates).length > 0) {
        const current = await prisma.psychologistProfile.findUnique({
          where: { userId },
          select: {
            profilePagePublished: true,
            catalogVisible: true
          }
        });
        if (!current) {
          return NextResponse.json(
            { message: "Профиль специалиста не найден" },
            { status: 400 }
          );
        }

        const mergedPage =
          profileUpdates.profilePagePublished !== undefined
            ? profileUpdates.profilePagePublished
            : current.profilePagePublished;
        const mergedCatalog =
          profileUpdates.catalogVisible !== undefined
            ? profileUpdates.catalogVisible
            : current.catalogVisible;

        if (profileUpdates.profilePagePublished === false) {
          profileUpdates.catalogVisible = false;
        }

        const effectivePage =
          profileUpdates.profilePagePublished === false ? false : mergedPage;
        const effectiveCatalog =
          profileUpdates.profilePagePublished === false
            ? false
            : mergedCatalog;

        if (effectiveCatalog && !effectivePage) {
          return NextResponse.json(
            {
              message:
                "Сначала опубликуйте страницу профиля — без этого каталог недоступен."
            },
            { status: 400 }
          );
        }

        try {
          await prisma.psychologistProfile.update({
            where: { userId },
            data: profileUpdates
          });
        } catch (err) {
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === "P2002"
          ) {
            return NextResponse.json(
              { message: "Этот адрес страницы уже занят. Выберите другой." },
              { status: 400 }
            );
          }
          throw err;
        }
      }
    }

    // --- Личные поля: одинаково для всех ролей (пишем только в User) ---
    let dateOfBirthValue: Date | null | undefined;
    if (body.dateOfBirth === null || body.dateOfBirth === "") {
      dateOfBirthValue = null;
    } else if (typeof body.dateOfBirth === "string") {
      const d = new Date(body.dateOfBirth);
      dateOfBirthValue = Number.isNaN(d.getTime()) ? undefined : d;
    }

    const userData: {
      name?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      dateOfBirth?: Date | null;
      email?: string;
      emailVerified?: null;
      phone?: string | null;
      country?: string | null;
      city?: string | null;
      gender?: string | null;
      maritalStatus?: string | null;
    } = {};

    if (typeof body.firstName === "string") {
      const v = body.firstName.trim().slice(0, MAX_FIRST_NAME_LENGTH);
      userData.firstName = v.length > 0 ? v : null;
    }
    if (typeof body.lastName === "string") {
      const v = body.lastName.trim().slice(0, MAX_LAST_NAME_LENGTH);
      userData.lastName = v.length > 0 ? v : null;
    }

    // Пересчитываем User.name из firstName/lastName если они переданы
    const newFirstName =
      "firstName" in userData ? (userData.firstName ?? "") : undefined;
    const newLastName =
      "lastName" in userData ? (userData.lastName ?? "") : undefined;
    if (newFirstName !== undefined || newLastName !== undefined) {
      // Получим текущие значения для тех полей, которые не обновляются
      if (newFirstName !== undefined || newLastName !== undefined) {
        const current = await prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true }
        });
        const fn = newFirstName ?? current?.firstName ?? "";
        const ln = newLastName ?? current?.lastName ?? "";
        const joined = [fn, ln].filter(Boolean).join(" ").trim();
        userData.name = joined.length > 0 ? joined.slice(0, MAX_NAME_LENGTH) : null;
      }
    } else if (body.name !== undefined) {
      // Клиент передаёт name напрямую (обратная совместимость)
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
      userData.phone = raw === null ? null : raw.trim().slice(0, MAX_PHONE_LENGTH);
    }
    if (body.country !== undefined) {
      const raw = body.country === null || body.country === "" ? null : String(body.country);
      userData.country = raw === null ? null : raw.trim().slice(0, MAX_COUNTRY_LENGTH);
    }
    if (body.city !== undefined) {
      const raw = body.city === null || body.city === "" ? null : String(body.city);
      userData.city = raw === null ? null : raw.trim().slice(0, MAX_CITY_LENGTH);
    }
    if (body.gender !== undefined) {
      userData.gender =
        body.gender === null || body.gender === "" ? null : String(body.gender);
    }
    if (body.maritalStatus !== undefined) {
      userData.maritalStatus =
        body.maritalStatus === null || body.maritalStatus === ""
          ? null
          : String(body.maritalStatus);
    }

    if (typeof body.email === "string") {
      const email = body.email.trim().toLowerCase();
      if (
        !email.includes("@") ||
        !email.includes(".") ||
        email.length < 5 ||
        email.length > MAX_EMAIL_LENGTH
      ) {
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
        select: {
          firstName: true,
          lastName: true,
          name: true,
          email: true,
          dateOfBirth: true,
          phone: true,
          country: true,
          city: true,
          gender: true,
          maritalStatus: true
        }
      });
      if (user) {
        // firstName/lastName из отдельных полей или из name (парсинг)
        const fn =
          user.firstName ??
          (user.name ?? "").trim().split(/\s+/).filter(Boolean)[0] ??
          "";
        const ln =
          user.lastName ??
          ((user.name ?? "").trim().split(/\s+/).filter(Boolean).slice(1).join(" ") ?? "");

        await prisma.clientProfile.updateMany({
          where: { userId },
          data: {
            ...(fn !== "" && { firstName: fn }),
            ...(fn !== "" && { lastName: ln }),
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
