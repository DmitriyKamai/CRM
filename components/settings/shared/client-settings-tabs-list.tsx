"use client";

import { TabsList } from "@/components/ui/tabs";
import {
  SettingsAccountsTabTrigger,
  SettingsProfileTabTrigger,
  SettingsSecurityTabTrigger
} from "@/components/settings/shared/settings-core-tab-triggers";

export function ClientSettingsTabsList() {
  return (
    <TabsList className="flex h-auto w-full flex-wrap gap-1 bg-muted/80 p-1">
      <SettingsProfileTabTrigger variant="client" />
      <SettingsSecurityTabTrigger variant="client" />
      <SettingsAccountsTabTrigger variant="client" />
    </TabsList>
  );
}
