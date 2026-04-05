import { notFound, permanentRedirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { psychologistPublicProfilePath } from "@/lib/psychologist-public-profile-path";

type ParamsPromise = { params: Promise<{ id: string }> };

/** Редирект со старого URL `/client/psychologists/...` на канонический `/{slug|id}`. */
export default async function LegacyPsychologistProfileRedirect({ params }: ParamsPromise) {
  const { id: segment } = await params;
  const trimmed = segment.trim();
  if (!trimmed) notFound();

  const raw = await prisma.psychologistProfile.findFirst({
    where: {
      profilePagePublished: true,
      OR: [{ id: trimmed }, { publicSlug: trimmed.toLowerCase() }]
    },
    select: { id: true, publicSlug: true, publicRouteSerial: true }
  });

  if (!raw) notFound();

  permanentRedirect(psychologistPublicProfilePath(raw));
}
