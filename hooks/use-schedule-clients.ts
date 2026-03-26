"use client";

import { useQuery } from "@tanstack/react-query";
import type { ClientOption } from "@/lib/schedule-utils";

async function fetchClients(): Promise<ClientOption[]> {
  const res = await fetch("/api/psychologist/clients");
  if (!res.ok) return [];
  const body = (await res.json().catch(() => null)) as
    | { clients?: { id: string; firstName: string; lastName: string; hasAccount?: boolean }[] }
    | null;
  if (!body || !Array.isArray(body.clients)) return [];
  return body.clients.map(c => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    hasAccount: c.hasAccount
  }));
}

export function useScheduleClients() {
  const query = useQuery({
    queryKey: ["schedule-clients"],
    queryFn: fetchClients,
    enabled: false,
    staleTime: 10 * 60 * 1000,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false
  });

  return {
    clients: query.data ?? [],
    clientsLoading: query.isFetching,
    loadClients: () => void query.refetch()
  };
}
