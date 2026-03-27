"use client";

import { useCallback, useMemo, useState } from "react";

export function useClientsSelection(clientIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  const selectedCount = selectedIds.size;

  const toggleOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(clientIds));
  }, [clientIds]);

  const enableMultiSelect = useCallback(() => {
    setSelectedIds(new Set());
    setMultiSelectMode(true);
  }, []);

  const cancelMultiSelect = useCallback(() => {
    setSelectedIds(new Set());
    setMultiSelectMode(false);
  }, []);

  const selectedIdsArray = useMemo(() => Array.from(selectedIds), [selectedIds]);

  return {
    selectedIds,
    selectedIdsArray,
    selectedCount,
    multiSelectMode,
    toggleOne,
    toggleAll,
    enableMultiSelect,
    cancelMultiSelect,
    setSelectedIds,
    setMultiSelectMode
  };
}
