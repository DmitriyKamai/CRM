"use client";

import dynamic from "next/dynamic";
import { TabsContent } from "@/components/ui/tabs";
import { SettingsSection } from "@/components/settings/shared/settings-section";

const CalendarSubscriptionBlock = dynamic(
  () => import("@/components/schedule/calendar-subscription").then((m) => ({ default: m.CalendarSubscriptionBlock })),
  { ssr: false }
);

export function PsychologistSettingsCalendarTab({
  schedulingEnabled,
  activeTab
}: {
  schedulingEnabled: boolean;
  activeTab: string;
}) {
  if (!schedulingEnabled) return null;

  return (
    <TabsContent value="calendar" className="mt-4">
      {activeTab === "calendar" && (
        <SettingsSection title="Подписаться на календарь">
          <CalendarSubscriptionBlock />
        </SettingsSection>
      )}
    </TabsContent>
  );
}
