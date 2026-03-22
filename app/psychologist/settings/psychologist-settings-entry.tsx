"use client";

import dynamic from "next/dynamic";

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

export function PsychologistSettingsEntry({
  schedulingEnabled
}: {
  schedulingEnabled: boolean;
}) {
  return <PsychologistSettingsForm schedulingEnabled={schedulingEnabled} />;
}
