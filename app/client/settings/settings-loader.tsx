"use client";

import dynamic from "next/dynamic";

const ClientSettingsForm = dynamic(
  () =>
    import("@/components/client/settings-form").then((m) => ({
      default: m.ClientSettingsForm
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

export function ClientSettingsLoader() {
  return <ClientSettingsForm />;
}
