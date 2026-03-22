import { PublicPsychologistsList } from "@/components/client/psychologists-list";
import { getPlatformModuleFlags } from "@/lib/platform-modules";

export const dynamic = "force-dynamic";

export default async function PsychologistsListPage() {
  const modules = await getPlatformModuleFlags();
  return (
    <div className="p-6">
      <PublicPsychologistsList schedulingEnabled={modules.scheduling} />
    </div>
  );
}

