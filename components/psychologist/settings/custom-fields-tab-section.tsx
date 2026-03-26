"use client";

import { CustomFieldsTabPanel } from "@/components/psychologist/settings/custom-fields-tab-panel";
import { useCustomFieldsSettings } from "@/hooks/use-custom-fields-settings";
import { useCustomFieldsTabUi } from "@/hooks/use-custom-fields-tab-ui";

const CUSTOM_FIELD_TYPE_LABELS: Record<string, string> = {
  TEXT: "Текст (одна строка)",
  MULTILINE: "Текст (несколько строк)",
  NUMBER: "Число",
  DATE: "Дата",
  BOOLEAN: "Флажок",
  SELECT: "Выбор из списка (один вариант)",
  MULTI_SELECT: "Выбор из списка (несколько вариантов)"
};

export function CustomFieldsTabSection({ enabled }: { enabled: boolean }) {
  const {
    customFields,
    customFieldsLoading,
    customFieldsError: customFieldsQueryError,
    refetchCustomFields
  } = useCustomFieldsSettings(enabled);

  const {
    effectiveCustomFieldsError,
    setCustomFieldsError,

    // Вкладки
    newTabName,
    setNewTabName,
    newTabDescription,
    setNewTabDescription,
    editingTabGroup,
    setEditingTabGroup,
    editingTabName,
    setEditingTabName,
    editingTabDescription,
    setEditingTabDescription,
    setLocalTabs,
    createTabDialogOpen,
    setCreateTabDialogOpen,
    allTabsForList,
    availableTabs,

    // Поля
    newFieldGroup,
    setNewFieldGroup,
    newFieldLabel,
    setNewFieldLabel,
    newFieldType,
    setNewFieldType,
    newFieldOptionLabels,
    setNewFieldOptionLabels,
    editingFieldId,
    setEditingFieldId,
    editingLabel,
    setEditingLabel,
    editingGroup,
    setEditingGroup,
    editingDescription,
    setEditingDescription
  } = useCustomFieldsTabUi({
    customFields,
    customFieldsQueryError
  });

  return (
    <CustomFieldsTabPanel
      effectiveCustomFieldsError={effectiveCustomFieldsError}

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

      availableTabs={availableTabs}
      customFieldsLoading={customFieldsLoading}
      customFields={customFields}
      newFieldGroup={newFieldGroup}
      setNewFieldGroupRight={setNewFieldGroup}
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

      customFieldTypeLabels={CUSTOM_FIELD_TYPE_LABELS}
    />
  );
}

