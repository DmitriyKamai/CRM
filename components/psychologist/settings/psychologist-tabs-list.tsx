"use client";

import { Briefcase, CalendarDays, ListChecks, ListFilter } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SettingsAccountsTabTrigger,
  SettingsProfileTabTrigger,
  SettingsSecurityTabTrigger
} from "@/components/settings/shared/settings-core-tab-triggers";

export function PsychologistTabsList({
  schedulingEnabled
}: {
  schedulingEnabled: boolean;
}) {
  return (
    <TabsList className="flex h-auto w-full min-w-0 flex-wrap justify-center gap-1 rounded-lg bg-muted/80 p-1 sm:justify-start lg:gap-1.5 lg:p-1.5">
      <SettingsProfileTabTrigger variant="psychologist" />
      <TabsTrigger
        value="professional"
        className="flex shrink-0 items-center gap-1.5 whitespace-normal px-2.5 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
      >
        <Briefcase className="h-4 w-4 shrink-0" />
        <span className="text-left leading-tight">Профиль</span>
      </TabsTrigger>
      <SettingsSecurityTabTrigger variant="psychologist" />
      <SettingsAccountsTabTrigger variant="psychologist" />
      {schedulingEnabled && (
        <TabsTrigger
          value="calendar"
          className="flex shrink-0 items-center gap-1.5 whitespace-normal px-2.5 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
        >
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="text-left leading-tight">Календарь</span>
        </TabsTrigger>
      )}
      <TabsTrigger
        value="customFields"
        className="flex max-w-full min-w-0 shrink-0 items-center gap-1.5 whitespace-normal px-2.5 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
      >
        <ListChecks className="h-4 w-4 shrink-0" />
        <span className="min-w-0 text-left leading-tight">Поля клиента</span>
      </TabsTrigger>
      <TabsTrigger
        value="statuses"
        className="flex max-w-full min-w-0 shrink-0 items-center gap-1.5 whitespace-normal px-2.5 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
      >
        <ListFilter className="h-4 w-4 shrink-0" />
        <span className="min-w-0 text-left leading-tight">Статусы клиентов</span>
      </TabsTrigger>
    </TabsList>
  );
}
