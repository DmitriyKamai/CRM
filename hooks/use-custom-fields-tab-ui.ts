"use client";

import { useMemo, useState } from "react";

import type { CustomFieldDef } from "@/hooks/use-custom-fields-settings";
import type {
  AvailableTab,
  CustomFieldType
} from "@/components/psychologist/settings/custom-fields-fields-panel";
import type { CustomFieldsTabRow } from "@/components/psychologist/settings/custom-fields-tabs-panel";

type LocalTab = { name: string; description: string };

export function useCustomFieldsTabUi({
  customFields,
  customFieldsQueryError
}: {
  customFields: CustomFieldDef[];
  customFieldsQueryError: string | null;
}) {
  const [customFieldsError, setCustomFieldsError] = useState<string | null>(null);
  const effectiveCustomFieldsError = customFieldsError ?? customFieldsQueryError;

  const [newTabName, setNewTabName] = useState("");
  const [newTabDescription, setNewTabDescription] = useState("");
  const [editingTabGroup, setEditingTabGroup] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState("");
  const [editingTabDescription, setEditingTabDescription] = useState("");
  const [localTabs, setLocalTabs] = useState<LocalTab[]>([]);
  const [createTabDialogOpen, setCreateTabDialogOpen] = useState(false);

  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldGroup, setNewFieldGroup] = useState("");
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>("TEXT");
  const [newFieldOptionLabels, setNewFieldOptionLabels] = useState<string[]>([]);

  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [editingGroup, setEditingGroup] = useState("");
  const [editingDescription, setEditingDescription] = useState("");

  const existingGroups = useMemo(() => {
    const map = new Map<string, { description: string; count: number }>();
    for (const f of customFields) {
      const raw =
        f.group && typeof f.group === "string" ? String(f.group).trim() : "";
      if (!raw) continue;
      const entry = map.get(raw) ?? { description: "", count: 0 };
      entry.count += 1;
      if (!entry.description && typeof f.description === "string") {
        const desc = f.description.trim();
        if (desc) entry.description = desc;
      }
      map.set(raw, entry);
    }
    return Array.from(map.entries()).map(([name, meta]) => ({
      name,
      description: meta.description,
      count: meta.count
    }));
  }, [customFields]);

  const availableTabs = useMemo(() => {
    const fromFields: AvailableTab[] = existingGroups.map((g) => ({
      name: g.name,
      description: g.description
    }));
    const extras = localTabs.filter(
      (t) => !fromFields.some((g) => g.name === t.name)
    );
    return [...fromFields, ...extras];
  }, [existingGroups, localTabs]);

  const allTabsForList = useMemo(() => {
    return availableTabs.map((t) => {
      const fromExisting = existingGroups.find((g) => g.name === t.name);
      return {
        name: t.name,
        description: t.description,
        count: fromExisting?.count ?? 0
      };
    }) as CustomFieldsTabRow[];
  }, [availableTabs, existingGroups]);

  return {
    effectiveCustomFieldsError,
    customFieldsError,
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
    localTabs,
    setLocalTabs,
    createTabDialogOpen,
    setCreateTabDialogOpen,
    allTabsForList,
    availableTabs,

    // Поля
    newFieldLabel,
    setNewFieldLabel,
    newFieldGroup,
    setNewFieldGroup,
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
  };
}

