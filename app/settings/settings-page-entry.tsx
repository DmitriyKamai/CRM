"use client";

import dynamic from "next/dynamic";

function SettingsFormDynamicLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 rounded-lg bg-muted" />
      <div className="h-64 rounded-lg bg-muted" />
    </div>
  );
}

const ClientSettingsForm = dynamic(
  () =>
    import("@/components/client/settings-form").then((m) => ({
      default: m.ClientSettingsForm
    })),
  {
    ssr: false,
    loading: SettingsFormDynamicLoading
  }
);

const PsychologistSettingsForm = dynamic(
  () =>
    import("@/components/psychologist/settings-form").then((m) => ({
      default: m.PsychologistSettingsForm
    })),
  {
    ssr: false,
    loading: SettingsFormDynamicLoading
  }
);

export function SettingsPageEntry({
  role,
  schedulingEnabled
}: {
  role: "CLIENT" | "PSYCHOLOGIST";
  schedulingEnabled: boolean;
}) {
  if (role === "CLIENT") {
    return <ClientSettingsForm />;
  }
  return <PsychologistSettingsForm schedulingEnabled={schedulingEnabled} />;
}
