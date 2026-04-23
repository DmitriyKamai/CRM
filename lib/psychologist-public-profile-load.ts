import { prisma } from "@/lib/db";
import { parsePublicRouteSerialFromSegment } from "@/lib/psychologist-public-route-serial";
import type { TherapyApproachFamily } from "@/lib/settings/therapy-approaches";
import { THERAPY_APPROACH_FAMILIES } from "@/lib/settings/therapy-approaches";

export type PsychologistPublicTherapyApproach = {
  slug: string;
  nameRu: string;
  family: TherapyApproachFamily;
  description: string | null;
};

export type PsychologistPublicProfileDto = {
  id: string;
  publicRouteSerial: number;
  firstName: string;
  lastName: string;
  specialization: string | null;
  bio: string | null;
  profilePhotoUrl: string | null;
  publicSlug: string | null;
  profilePagePublished: boolean;
  practiceCountry: string | null;
  practiceCity: string | null;
  worksOnline: boolean;
  contactPhone: string | null;
  contactTelegram: string | null;
  contactViber: string | null;
  contactWhatsapp: string | null;
  therapyApproaches: PsychologistPublicTherapyApproach[];
};

function toFamily(raw: string): TherapyApproachFamily {
  return (THERAPY_APPROACH_FAMILIES as readonly string[]).includes(raw)
    ? (raw as TherapyApproachFamily)
    : "other";
}

/**
 * Профиль с опубликованной страницей по сегменту URL: алиас, id{N} или legacy cuid.
 */
export async function loadPublishedPsychologistByUrlSegment(
  segment: string
): Promise<PsychologistPublicProfileDto | null> {
  const trimmed = segment.trim();
  if (!trimmed) return null;
  const slugKey = trimmed.toLowerCase();
  const serial = parsePublicRouteSerialFromSegment(trimmed);

  const orConditions: Array<
    | { id: string }
    | { publicSlug: string }
    | { publicRouteSerial: number }
  > = [{ id: trimmed }, { publicSlug: slugKey }];
  if (serial !== null) {
    orConditions.push({ publicRouteSerial: serial });
  }

  const raw = await prisma.psychologistProfile.findFirst({
    where: {
      profilePagePublished: true,
      OR: orConditions
    },
    select: {
      id: true,
      publicRouteSerial: true,
      publicSlug: true,
      specialization: true,
      bio: true,
      profilePhotoUrl: true,
      profilePagePublished: true,
      practiceCountry: true,
      practiceCity: true,
      worksOnline: true,
      contactPhone: true,
      contactTelegram: true,
      contactViber: true,
      contactWhatsapp: true,
      user: { select: { firstName: true, lastName: true, name: true } },
      therapyApproaches: {
        where: { isActive: true },
        orderBy: [{ family: "asc" }, { orderIndex: "asc" }, { nameRu: "asc" }],
        select: {
          slug: true,
          nameRu: true,
          family: true,
          description: true
        }
      }
    }
  });

  if (!raw?.profilePagePublished) return null;

  return {
    id: raw.id,
    publicRouteSerial: raw.publicRouteSerial,
    publicSlug: raw.publicSlug ?? null,
    firstName: raw.user.firstName ?? (raw.user.name ?? "").split(" ")[0] ?? "",
    lastName:
      raw.user.lastName ?? (raw.user.name ?? "").split(" ").slice(1).join(" ") ?? "",
    specialization: raw.specialization ?? null,
    bio: raw.bio ?? null,
    profilePhotoUrl: raw.profilePhotoUrl ?? null,
    profilePagePublished: raw.profilePagePublished,
    practiceCountry: raw.practiceCountry ?? null,
    practiceCity: raw.practiceCity ?? null,
    worksOnline: raw.worksOnline ?? false,
    contactPhone: raw.contactPhone ?? null,
    contactTelegram: raw.contactTelegram ?? null,
    contactViber: raw.contactViber ?? null,
    contactWhatsapp: raw.contactWhatsapp ?? null,
    therapyApproaches: raw.therapyApproaches.map((a) => ({
      slug: a.slug,
      nameRu: a.nameRu,
      family: toFamily(a.family),
      description: a.description ?? null
    }))
  };
}
