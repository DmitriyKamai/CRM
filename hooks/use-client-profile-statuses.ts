"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";

type StatusItem = { id: string; label: string; color: string };

export function useClientProfileStatuses<TUpdatedPayload>(opts: {
  clientId: string;

  statusId: string | null;
  setStatusId: Dispatch<SetStateAction<string | null>>;
  setStatusLabel: Dispatch<SetStateAction<string | null>>;
  setStatusColor: Dispatch<SetStateAction<string | null>>;

  setError: Dispatch<SetStateAction<string | null>>;
  setHistoryTick: Dispatch<SetStateAction<number>>;

  onUpdated?: (next: TUpdatedPayload) => void;
  buildUpdatedPayload: (applied: {
    statusId: string | null;
    statusLabel: string | null;
    statusColor: string | null;
  }) => TUpdatedPayload;
}) {
  const {
    clientId,
    statusId,
    setStatusId,
    setStatusLabel,
    setStatusColor,
    setError,
    setHistoryTick,
    onUpdated,
    buildUpdatedPayload
  } = opts;

  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [statusSaving, setStatusSaving] = useState(false);

  useEffect(() => {
    fetch("/api/psychologist/client-statuses")
      .then((r) => (r?.ok ? r.json() : null))
      .then((data: { items?: StatusItem[] } | null) => {
        if (Array.isArray(data?.items)) setStatuses(data.items);
      })
      .catch(() => {});
  }, []);

  const currentStatus = useMemo(
    () =>
      statusId != null ? statuses.find((s) => s.id === statusId) ?? null : null,
    [statusId, statuses]
  );

  async function handleStatusChange(next: string) {
    const nextId = next === "__none__" ? null : next;
    const nextStatus =
      nextId != null ? statuses.find((s) => s.id === nextId) ?? null : null;

    setStatusSaving(true);
    setError(null);
    try {
      const body: { statusId: string | null } = { statusId: nextId };
      const res = await fetch(`/api/psychologist/clients/${clientId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message ?? "Не удалось обновить статус");
      }

      const applied = {
        statusId: nextId,
        statusLabel: nextStatus?.label ?? null,
        statusColor: nextStatus?.color ?? null
      };

      setStatusId(applied.statusId);
      setStatusLabel(applied.statusLabel);
      setStatusColor(applied.statusColor);

      if (onUpdated) onUpdated(buildUpdatedPayload(applied));
      setHistoryTick((t) => t + 1);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Не удалось обновить статус");
    } finally {
      setStatusSaving(false);
    }
  }

  return {
    statuses,
    currentStatus,
    statusSaving,
    handleStatusChange
  };
}

