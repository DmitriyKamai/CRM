"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

type ClientStatusItem = {
  id: string;
  key?: string;
  label: string;
  color: string;
  order: number;
};

export type { ClientStatusItem };

const KEY = ["psychologist-client-statuses-settings"] as const;

async function fetchStatuses(): Promise<ClientStatusItem[]> {
  const res = await fetch("/api/psychologist/client-statuses");
  if (!res.ok) return [];
  const data: { items?: ClientStatusItem[] } | null = await res.json().catch(() => null);
  return Array.isArray(data?.items) ? data.items : [];
}

export function useClientStatusesSettings(enabled: boolean) {
  const qc = useQueryClient();

  const { data: clientStatuses = [], isLoading } = useQuery({
    queryKey: KEY,
    queryFn: fetchStatuses,
    enabled
  });

  function refetch() {
    return qc.invalidateQueries({ queryKey: KEY });
  }

  return {
    clientStatuses,
    clientStatusesLoading: isLoading,
    refetchClientStatuses: refetch
  };
}
