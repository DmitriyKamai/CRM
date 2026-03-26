"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type ClientDto = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  notes?: string | null;
  createdAt: string;
  hasAccount?: boolean;
  avatarUrl?: string | null;
  statusId?: string | null;
  statusLabel?: string | null;
  statusColor?: string | null;
  customFields?: Record<string, unknown>;
};

export type ClientStatus = { id: string; label: string; color: string };
export type CustomFieldDef = { id: string; label: string };

const CLIENTS_KEY = ["psychologist-clients"] as const;
const STATUSES_KEY = ["psychologist-client-statuses"] as const;
const CUSTOM_FIELDS_KEY = ["psychologist-custom-field-defs"] as const;
const COL_ORDER_KEY = ["psychologist-clients-table-column-order"] as const;

async function fetchClients(): Promise<ClientDto[]> {
  const res = await fetch("/api/psychologist/clients");
  if (!res.ok) {
    const d = await res.json().catch(() => null);
    throw new Error(d?.message ?? "Не удалось загрузить клиентов");
  }
  const data = (await res.json()) as { clients: ClientDto[] };
  return data.clients;
}

async function fetchStatuses(): Promise<ClientStatus[]> {
  const res = await fetch("/api/psychologist/client-statuses");
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  return data?.items ?? [];
}

async function fetchCustomFieldDefs(): Promise<CustomFieldDef[]> {
  const res = await fetch("/api/psychologist/custom-fields");
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  return (data?.items ?? []).map((d: { id: string; label: string }) => ({
    id: d.id,
    label: d.label
  }));
}

async function fetchColumnOrder(): Promise<string[] | null> {
  const res = await fetch("/api/psychologist/clients-table-settings");
  if (!res.ok) return null;
  const data = (await res.json()) as { columnOrder: string[] | null };
  return data.columnOrder ?? null;
}

async function patchColumnOrder(order: string[]): Promise<void> {
  const res = await fetch("/api/psychologist/clients-table-settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ columnOrder: order })
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(typeof err?.message === "string" ? err.message : "Не удалось сохранить порядок колонок");
  }
}

async function createClientApi(body: Record<string, unknown>): Promise<void> {
  const res = await fetch("/api/psychologist/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message ?? "Не удалось создать клиента");
}

async function deleteClientApi(id: string): Promise<void> {
  const res = await fetch(`/api/psychologist/clients/${id}`, { method: "DELETE" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message ?? "Не удалось удалить клиента");
}

async function bulkDeleteClientsApi(ids: string[]): Promise<void> {
  const res = await fetch("/api/psychologist/clients", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids })
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message ?? "Не удалось удалить выбранных клиентов");
}

export function useClientsData() {
  const qc = useQueryClient();

  const { data: clients = [], isLoading: clientsLoading, error: clientsError } = useQuery({
    queryKey: CLIENTS_KEY,
    queryFn: fetchClients,
    // Списки клиентов редко должны обновляться "на каждый рендер".
    staleTime: 5 * 60 * 1000,
    refetchOnReconnect: false
  });

  const { data: statuses = [] } = useQuery({
    queryKey: STATUSES_KEY,
    queryFn: fetchStatuses,
    staleTime: 10 * 60 * 1000,
    refetchOnReconnect: false
  });

  const { data: customFieldDefs = [] } = useQuery({
    queryKey: CUSTOM_FIELDS_KEY,
    queryFn: fetchCustomFieldDefs,
    staleTime: 10 * 60 * 1000,
    refetchOnReconnect: false
  });

  const { data: columnOrder } = useQuery({
    queryKey: COL_ORDER_KEY,
    queryFn: fetchColumnOrder,
    staleTime: 10 * 60 * 1000,
    refetchOnReconnect: false
  });

  const persistColumnOrder = useMutation({
    mutationFn: patchColumnOrder,
    onError: (e: Error) => toast.error(e.message)
  });

  const createClient = useMutation({
    mutationFn: createClientApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: CLIENTS_KEY }),
    onError: (e: Error) => toast.error(e.message)
  });

  const deleteClient = useMutation({
    mutationFn: deleteClientApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: CLIENTS_KEY }),
    onError: (e: Error) => toast.error(e.message)
  });

  const bulkDeleteClients = useMutation({
    mutationFn: bulkDeleteClientsApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: CLIENTS_KEY }),
    onError: (e: Error) => toast.error(e.message)
  });

  function updateClientInCache(id: string, patch: Partial<ClientDto>) {
    qc.setQueryData<ClientDto[]>(CLIENTS_KEY, prev =>
      prev?.map(c => (c.id === id ? { ...c, ...patch } : c))
    );
  }

  function invalidateClients() {
    return qc.invalidateQueries({ queryKey: CLIENTS_KEY });
  }

  return {
    clients,
    clientsLoading,
    clientsError: clientsError ? (clientsError as Error).message : null,
    statuses,
    customFieldDefs,
    columnOrder: columnOrder ?? null,
    persistColumnOrder: (order: string[]) => persistColumnOrder.mutate(order),
    createClient,
    deleteClient,
    bulkDeleteClients,
    updateClientInCache,
    invalidateClients
  };
}
