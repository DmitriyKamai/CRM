"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useState } from "react";

type CustomFieldOption = { value: string; label: string };
type CustomFieldDef = {
  id: string;
  key?: string | null;
  label: string;
  type: string;
  group?: string | null;
  description?: string | null;
  options?: { selectOptions?: CustomFieldOption[] } | null;
};

export function useClientProfileCustomFields(opts: {
  clientId: string;
  setError: Dispatch<SetStateAction<string | null>>;
  setHistoryTick: Dispatch<SetStateAction<number>>;
}) {
  const { clientId, setError, setHistoryTick } = opts;

  const [customFieldsLoading, setCustomFieldsLoading] = useState(false);
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});
  const [customFieldsSaving, setCustomFieldsSaving] = useState(false);

  const refetchCustomFieldDefs = useCallback(() => {
    void (async () => {
      setCustomFieldsLoading(true);
    })();

    fetch(`/api/psychologist/clients/${clientId}/custom-fields`)
      .then((r) => (r?.ok ? r.json() : null))
      .then((data) => {
        if (data?.definitions) setCustomFieldDefs(data.definitions);
        if (data?.values) setCustomFieldValues(data.values);
      })
      .catch(() => {})
      .finally(() => setCustomFieldsLoading(false));
  }, [clientId]);

  useEffect(() => {
    refetchCustomFieldDefs();
  }, [clientId, refetchCustomFieldDefs]);

  async function saveCustomFields(): Promise<void> {
    setCustomFieldsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/psychologist/clients/${clientId}/custom-fields`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: customFieldValues })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message ?? "Не удалось сохранить пользовательские поля";
        setError(msg);
        throw new Error(msg);
      }
      setHistoryTick((t) => t + 1);
    } finally {
      setCustomFieldsSaving(false);
    }
  }

  return {
    customFieldsLoading,
    customFieldDefs,
    setCustomFieldDefs,
    customFieldValues,
    setCustomFieldValues,
    customFieldsSaving,
    setCustomFieldsSaving,
    refetchCustomFieldDefs,
    saveCustomFields
  };
}

