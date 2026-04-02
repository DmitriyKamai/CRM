"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

export function SettingsFormDynamicLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 rounded-lg bg-muted" />
      <div className="h-64 rounded-lg bg-muted" />
    </div>
  );
}

/** Обёртка над `next/dynamic` с едиными опциями для форм настроек. */
export function dynamicSettingsForm(
  load: () => Promise<{ default: ComponentType<Record<string, unknown>> }>
) {
  return dynamic(load, {
    ssr: false,
    loading: SettingsFormDynamicLoading
  });
}
