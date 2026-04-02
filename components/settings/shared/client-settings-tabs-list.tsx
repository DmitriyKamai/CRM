"use client";

import { SlidersHorizontal } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SettingsAccountsTabTrigger,
  SettingsProfileTabTrigger,
  SettingsSecurityTabTrigger
} from "@/components/settings/shared/settings-core-tab-triggers";

export function ClientSettingsTabsList() {
  return (
    <TabsList className="flex h-auto w-full flex-wrap gap-1 bg-muted/80 p-1">
      <SettingsProfileTabTrigger variant="client" />
      <TabsTrigger value="preferences" className="flex shrink-0 items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 shrink-0" />
        Предпочтения
      </TabsTrigger>
      <SettingsSecurityTabTrigger variant="client" />
      <SettingsAccountsTabTrigger variant="client" />
    </TabsList>
  );
}
