import { PublicPsychologistsList } from "@/components/client/psychologists-list";
import { getPublishedPsychologistsForCatalog } from "@/lib/psychologists-catalog";
import { getPlatformModuleFlags } from "@/lib/platform-modules";

export const dynamic = "force-dynamic";

export default async function PsychologistsListPage() {
  const [modules, psychologists] = await Promise.all([
    getPlatformModuleFlags(),
    getPublishedPsychologistsForCatalog()
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <PublicPsychologistsList
        schedulingEnabled={modules.scheduling}
        initialPsychologists={psychologists}
      />
    </div>
  );
}
