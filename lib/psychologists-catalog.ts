import { prisma } from "@/lib/db";

export type PsychologistCatalogEntry = {
  id: string;
  /** Сегмент URL публичной страницы; если null — используется `id`. */
  publicSlug: string | null;
  firstName: string;
  lastName: string;
  specialization: string | null;
  bio: string | null;
  practiceCountry: string | null;
  practiceCity: string | null;
  worksOnline: boolean;
  profilePhotoUrl: string | null;
};

export async function getPublishedPsychologistsForCatalog(): Promise<
  PsychologistCatalogEntry[]
> {
  const rows = await prisma.psychologistProfile.findMany({
    where: { catalogVisible: true, profilePagePublished: true },
    select: {
      id: true,
      publicSlug: true,
      specialization: true,
      bio: true,
      profilePhotoUrl: true,
      practiceCountry: true,
      practiceCity: true,
      worksOnline: true,
      user: { select: { firstName: true, lastName: true, name: true } }
    },
    orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }]
  });
  return rows.map(p => ({
    id: p.id,
    publicSlug: p.publicSlug ?? null,
    firstName: p.user.firstName ?? (p.user.name ?? "").split(" ")[0] ?? "",
    lastName: p.user.lastName ?? (p.user.name ?? "").split(" ").slice(1).join(" ") ?? "",
    specialization: p.specialization ?? null,
    bio: p.bio ?? null,
    practiceCountry: p.practiceCountry ?? null,
    practiceCity: p.practiceCity ?? null,
    worksOnline: p.worksOnline ?? false,
    profilePhotoUrl: p.profilePhotoUrl ?? null
  }));
}
