import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { PsychologistPublicProfileView } from "@/components/client/psychologist-public-profile-view";
import { loadPublishedPsychologistByUrlSegment } from "@/lib/psychologist-public-profile-load";
import { psychologistPublicProfilePath } from "@/lib/psychologist-public-profile-path";
import { getPlatformModuleFlags } from "@/lib/platform-modules";

type ParamsPromise = { params: Promise<{ profileSegment: string }> };

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    String((err as { digest?: string }).digest ?? "").includes("NEXT_REDIRECT")
  );
}

export default async function PublicPsychologistProfilePage({ params }: ParamsPromise) {
  const { profileSegment } = await params;
  const segment = profileSegment.trim();
  if (!segment) notFound();

  let psychologist = null as Awaited<
    ReturnType<typeof loadPublishedPsychologistByUrlSegment>
  >;
  let errorMessage: string | null = null;

  try {
    psychologist = await loadPublishedPsychologistByUrlSegment(segment);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("Public psychologist profile page error:", err);
    errorMessage = err instanceof Error ? err.message : "Ошибка загрузки страницы";
  }

  if (errorMessage) {
    return (
      <div className="space-y-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-6 text-amber-900 dark:text-amber-200">
        <p className="font-medium">Ошибка загрузки страницы</p>
        <p className="text-sm">{errorMessage}</p>
        <Link href="/catalog" className="text-sm underline">
          К списку психологов
        </Link>
      </div>
    );
  }

  if (!psychologist) notFound();

  const canonical = psychologistPublicProfilePath(psychologist);
  if (`/${segment}` !== canonical) {
    permanentRedirect(canonical);
  }

  const modules = await getPlatformModuleFlags();
  return (
    <PsychologistPublicProfileView
      psychologist={psychologist}
      bookingEnabled={modules.scheduling}
    />
  );
}
