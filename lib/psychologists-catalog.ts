import { prisma } from "@/lib/db";

/** Поля каталога психологов для клиента (страница списка и API). */
export const publishedPsychologistCatalogSelect = {
  id: true,
  firstName: true,
  lastName: true,
  specialization: true,
  bio: true,
  country: true,
  city: true,
  profilePhotoUrl: true
} as const;

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
    select: publishedPsychologistCatalogSelect,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
  });
  return rows;
}
