import { prisma } from "@/lib/db";

export type PsychologistCatalogEntry = {
  id: string;
  firstName: string;
  lastName: string;
  specialization: string | null;
  bio: string | null;
  country: string | null;
  city: string | null;
  profilePhotoUrl: string | null;
};

export async function getPublishedPsychologistsForCatalog(): Promise<
  PsychologistCatalogEntry[]
> {
  const rows = await prisma.psychologistProfile.findMany({
    where: { profilePhotoPublished: true },
    select: {
      id: true,
      specialization: true,
      bio: true,
      profilePhotoUrl: true,
      user: { select: { firstName: true, lastName: true, name: true, country: true, city: true } }
    },
    orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }]
  });
  return rows.map(p => ({
    id: p.id,
    firstName: p.user.firstName ?? (p.user.name ?? "").split(" ")[0] ?? "",
    lastName: p.user.lastName ?? (p.user.name ?? "").split(" ").slice(1).join(" ") ?? "",
    specialization: p.specialization ?? null,
    bio: p.bio ?? null,
    country: p.user.country ?? null,
    city: p.user.city ?? null,
    profilePhotoUrl: p.profilePhotoUrl ?? null
  }));
}
