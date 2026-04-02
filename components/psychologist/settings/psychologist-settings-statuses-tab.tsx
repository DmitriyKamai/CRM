"use client";

import { TabsContent } from "@/components/ui/tabs";
import { SettingsSection } from "@/components/settings/shared/settings-section";
import { useClientStatusesSettings } from "@/hooks/use-client-statuses-settings";
import { useClientStatusesTabUi } from "@/hooks/use-client-statuses-tab-ui";
import { ClientStatusesTabPanel } from "@/components/psychologist/settings/client-statuses-tab-panel";

export function PsychologistSettingsStatusesTab({ activeTab }: { activeTab: string }) {
  const clientStatusesTab = useClientStatusesTabUi();
  const { clientStatuses, clientStatusesLoading, refetchClientStatuses } =
    useClientStatusesSettings(activeTab === "statuses");

  return (
    <TabsContent value="statuses" className="mt-4">
      {activeTab === "statuses" && (
        <SettingsSection title="Статусы клиентов">
          <ClientStatusesTabPanel
            clientStatuses={clientStatuses}
            clientStatusesLoading={clientStatusesLoading}
            STATUS_COLOR_PRESETS={clientStatusesTab.STATUS_COLOR_PRESETS}
            addStatusDialogOpen={clientStatusesTab.addStatusDialogOpen}
            setAddStatusDialogOpen={clientStatusesTab.setAddStatusDialogOpen}
            newStatusLabel={clientStatusesTab.newStatusLabel}
            setNewStatusLabel={clientStatusesTab.setNewStatusLabel}
            newStatusColor={clientStatusesTab.newStatusColor}
            setNewStatusColor={clientStatusesTab.setNewStatusColor}
            editingStatusId={clientStatusesTab.editingStatusId}
            setEditingStatusId={clientStatusesTab.setEditingStatusId}
            editingStatusLabel={clientStatusesTab.editingStatusLabel}
            setEditingStatusLabel={clientStatusesTab.setEditingStatusLabel}
            editingStatusColor={clientStatusesTab.editingStatusColor}
            setEditingStatusColor={clientStatusesTab.setEditingStatusColor}
            refetchClientStatuses={refetchClientStatuses}
          />
        </SettingsSection>
      )}
    </TabsContent>
  );
}
