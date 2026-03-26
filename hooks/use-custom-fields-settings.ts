"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

type CustomFieldOption = { value: string; label: string };
type CustomFieldDef = {
  id: string;
  key?: string | null;
  label: string;
  type: "TEXT" | "MULTILINE" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT" | "MULTI_SELECT" | string;
  group?: string | null;
  description?: string | null;
  options?: { selectOptions?: CustomFieldOption[] } | null;
  order?: number | null;
};

export type { CustomFieldDef, CustomFieldOption };

const KEY = ["psychologist-custom-fields-settings"] as const;

async function fetchCustomFields(): Promise<CustomFieldDef[]> {
  const res = await fetch("/api/psychologist/custom-fields");
  if (!res.ok) throw new Error("Не удалось загрузить пользовательские поля");
  const data = await res.json().catch(() => null);
  return data?.items ?? [];
}

export function useCustomFieldsSettings(enabled: boolean) {
  const qc = useQueryClient();

  const { data: customFields = [], isLoading, error } = useQuery({
    queryKey: KEY,
    queryFn: fetchCustomFields,
    enabled,
    staleTime: 10 * 60 * 1000,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false
  });

  function refetch() {
    return qc.invalidateQueries({ queryKey: KEY });
  }

  return {
    customFields,
    customFieldsLoading: isLoading,
    customFieldsError: error ? (error as Error).message : null,
    refetchCustomFields: refetch
  };
}
