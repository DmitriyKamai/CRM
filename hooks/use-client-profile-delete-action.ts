"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";
import { useRouter } from "next/navigation";

export function useClientProfileDeleteAction(opts: {
  clientId: string;
  onDeleted?: () => void;
  setDeleting: Dispatch<SetStateAction<boolean>>;
  setDeleteDialogOpen: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
}) {
  const { clientId, onDeleted, setDeleting, setDeleteDialogOpen, setError } = opts;
  const router = useRouter();

  const confirmDelete = useCallback(async () => {
    setDeleteDialogOpen(false);
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/psychologist/clients/${clientId}`, {
        method: "DELETE"
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message ?? "Не удалось удалить клиента");
      }

      if (onDeleted) onDeleted();
      else router.push("/psychologist/clients");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Не удалось удалить клиента");
    } finally {
      setDeleting(false);
    }
  }, [clientId, onDeleted, router, setDeleteDialogOpen, setDeleting, setError]);

  return { confirmDelete };
}

