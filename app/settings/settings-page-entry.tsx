"use client";

import { dynamicSettingsForm } from "@/lib/settings/dynamic-settings-form";

const ClientSettingsForm = dynamicSettingsForm(() =>
  import("@/components/client/settings-form").then((m) => ({ default: m.ClientSettingsForm }))
);

const PsychologistSettingsForm = dynamicSettingsForm(() =>
  import("@/components/psychologist/settings-form").then((m) => ({
    default: m.PsychologistSettingsForm
  }))
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
