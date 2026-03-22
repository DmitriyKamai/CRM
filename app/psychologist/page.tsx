import { PsychologistDashboardClient } from "@/components/psychologist/psychologist-dashboard-client";
import { getPlatformModuleFlags } from "@/lib/platform-modules";

export default async function PsychologistDashboardPage() {
  const modules = await getPlatformModuleFlags();
  return (
    <PsychologistDashboardClient
      schedulingEnabled={modules.scheduling}
      diagnosticsEnabled={modules.diagnostics}
    />
  );
}
