"use client";

import type { Dispatch, SetStateAction } from "react";

import type { CustomFieldDef } from "@/hooks/use-custom-fields-settings";
import { CustomFieldsFieldsPanel } from "@/components/psychologist/settings/custom-fields-fields-panel";
import type { AvailableTab, CustomFieldType } from "@/components/psychologist/settings/custom-fields-fields-panel";
import {
  CustomFieldsTabsPanel,
  type CustomFieldsTabRow
} from "@/components/psychologist/settings/custom-fields-tabs-panel";

type Props = {
  effectiveCustomFieldsError: string | null;

  // Вкладки (left panel)
  createTabDialogOpen: boolean;
  setCreateTabDialogOpen: Dispatch<SetStateAction<boolean>>;
  newTabName: string;
  setNewTabName: Dispatch<SetStateAction<string>>;
  newTabDescription: string;
  setNewTabDescription: Dispatch<SetStateAction<string>>;
  setLocalTabs: Dispatch<SetStateAction<{ name: string; description: string }[]>>;
  setNewFieldGroup: Dispatch<SetStateAction<string>>;
  allTabsForList: CustomFieldsTabRow[];
  editingTabGroup: string | null;
  setEditingTabGroup: Dispatch<SetStateAction<string | null>>;
  editingTabName: string;
  setEditingTabName: Dispatch<SetStateAction<string>>;
  editingTabDescription: string;
  setEditingTabDescription: Dispatch<SetStateAction<string>>;

  // Поля (right panel)
  availableTabs: AvailableTab[];
  customFieldsLoading: boolean;
  customFields: CustomFieldDef[];
  newFieldGroup: string;
  setNewFieldGroupRight: Dispatch<SetStateAction<string>>;
  newFieldLabel: string;
  setNewFieldLabel: Dispatch<SetStateAction<string>>;
  newFieldType: CustomFieldType;
  setNewFieldType: Dispatch<SetStateAction<CustomFieldType>>;
  newFieldOptionLabels: string[];
  setNewFieldOptionLabels: Dispatch<SetStateAction<string[]>>;

  setCustomFieldsError: Dispatch<SetStateAction<string | null>>;
  refetchCustomFields: () => void;

  editingFieldId: string | null;
  setEditingFieldId: Dispatch<SetStateAction<string | null>>;
  editingLabel: string;
  setEditingLabel: Dispatch<SetStateAction<string>>;
  editingGroup: string;
  setEditingGroup: Dispatch<SetStateAction<string>>;
  editingDescription: string;
  setEditingDescription: Dispatch<SetStateAction<string>>;

  customFieldTypeLabels: Record<string, string>;
};

export function CustomFieldsTabPanel({
  effectiveCustomFieldsError,

  createTabDialogOpen,
  setCreateTabDialogOpen,
  newTabName,
  setNewTabName,
  newTabDescription,
  setNewTabDescription,
  setLocalTabs,
  setNewFieldGroup,
  allTabsForList,
  editingTabGroup,
  setEditingTabGroup,
  editingTabName,
  setEditingTabName,
  editingTabDescription,
  setEditingTabDescription,

  availableTabs,
  customFieldsLoading,
  customFields,
  newFieldGroup,
  setNewFieldGroupRight,
  newFieldLabel,
  setNewFieldLabel,
  newFieldType,
  setNewFieldType,
  newFieldOptionLabels,
  setNewFieldOptionLabels,

  setCustomFieldsError,
  refetchCustomFields,

  editingFieldId,
  setEditingFieldId,
  editingLabel,
  setEditingLabel,
  editingGroup,
  setEditingGroup,
  editingDescription,
  setEditingDescription,

  customFieldTypeLabels
}: Props) {
  return (
    <div className="space-y-4">
      {effectiveCustomFieldsError && (
        <div className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
          {effectiveCustomFieldsError}
        </div>
      )}

      <CustomFieldsTabsPanel
        createTabDialogOpen={createTabDialogOpen}
        setCreateTabDialogOpen={setCreateTabDialogOpen}
        newTabName={newTabName}
        setNewTabName={setNewTabName}
        newTabDescription={newTabDescription}
        setNewTabDescription={setNewTabDescription}
        setLocalTabs={setLocalTabs}
        setNewFieldGroup={setNewFieldGroup}
        allTabsForList={allTabsForList}
        editingTabGroup={editingTabGroup}
        setEditingTabGroup={setEditingTabGroup}
        editingTabName={editingTabName}
        setEditingTabName={setEditingTabName}
        editingTabDescription={editingTabDescription}
        setEditingTabDescription={setEditingTabDescription}
        customFields={customFields}
        refetchCustomFields={refetchCustomFields}
        setCustomFieldsError={setCustomFieldsError}
      />

      <CustomFieldsFieldsPanel
        availableTabs={availableTabs}
        customFieldsLoading={customFieldsLoading}
        customFields={customFields}
        newFieldGroup={newFieldGroup}
        setNewFieldGroup={setNewFieldGroupRight}
        newFieldLabel={newFieldLabel}
        setNewFieldLabel={setNewFieldLabel}
        newFieldType={newFieldType}
        setNewFieldType={setNewFieldType}
        newFieldOptionLabels={newFieldOptionLabels}
        setNewFieldOptionLabels={setNewFieldOptionLabels}
        setCustomFieldsError={setCustomFieldsError}
        refetchCustomFields={refetchCustomFields}
        editingFieldId={editingFieldId}
        setEditingFieldId={setEditingFieldId}
        editingLabel={editingLabel}
        setEditingLabel={setEditingLabel}
        editingGroup={editingGroup}
        setEditingGroup={setEditingGroup}
        editingDescription={editingDescription}
        setEditingDescription={setEditingDescription}
        customFieldTypeLabels={customFieldTypeLabels}
      />
    </div>
  );
}

