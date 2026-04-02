"use client";

import { TabsContent } from "@/components/ui/tabs";
import { SettingsSection } from "@/components/settings/shared/settings-section";
import { CustomFieldsTabSection } from "@/components/psychologist/settings/custom-fields-tab-section";

export function PsychologistSettingsCustomFieldsTab({ activeTab }: { activeTab: string }) {
  return (
    <TabsContent value="customFields" className="mt-4">
      <SettingsSection title="Пользовательские поля клиента">
        <CustomFieldsTabSection enabled={activeTab === "customFields"} />
      </SettingsSection>
    </TabsContent>
  );
}
