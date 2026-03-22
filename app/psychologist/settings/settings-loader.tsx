import dynamic from "next/dynamic";

import { getPlatformModuleFlags } from "@/lib/platform-modules";

const PsychologistSettingsForm = dynamic(
  () =>
    import("@/components/psychologist/settings-form").then((m) => ({
      default: m.PsychologistSettingsForm
    })),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse space-y-4">
        <div className="h-10 rounded-lg bg-muted" />
        <div className="h-64 rounded-lg bg-muted" />
      </div>
    )
  }
);

export async function SettingsLoader() {
  const modules = await getPlatformModuleFlags();
  return <PsychologistSettingsForm schedulingEnabled={modules.scheduling} />;
}
