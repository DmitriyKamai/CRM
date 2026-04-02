"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  deleteNotification,
  deleteNotificationsBatch,
  fetchNotificationsList,
  patchNotificationRead
} from "@/lib/notifications/api-client";
import { notificationsKeys } from "@/lib/query-keys/notifications";

/**
 * Список уведомлений; при открытии панели список перезапрашивается (как раньше с Redux).
 */
export function useNotificationsList(panelOpen: boolean) {
  const { refetch, ...query } = useQuery({
    queryKey: notificationsKeys.list(),
    queryFn: fetchNotificationsList
  });

  useEffect(() => {
    if (panelOpen) void refetch();
  }, [panelOpen, refetch]);

  return { refetch, ...query };
}

export function useMarkNotificationReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patchNotificationRead(id, true),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationsKeys.list() });
    },
    onError: (e: Error) => {
      toast.error(e.message);
    }
  });
}

export function useRemoveNotificationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationsKeys.list() });
    },
    onError: (e: Error) => {
      toast.error(e.message);
    }
  });
}

export function useClearAllNotificationsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteNotificationsBatch,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationsKeys.list() });
    },
    onError: () => {
      toast.error("Не удалось очистить уведомления");
    }
  });
}
