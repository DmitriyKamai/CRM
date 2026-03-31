import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type AppointmentStatus =
  | "PENDING_CONFIRMATION"
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELED"
  | "NO_SHOW";

export type AppointmentItem = {
  id: string;
  start: string;
  end: string;
  psychologistName: string;
  status: AppointmentStatus;
  proposedByPsychologist?: boolean;
};

type DiagnosticItem = {
  id: string;
  testTitle: string;
  createdAt: string;
  interpretation?: string | null;
};

type PendingDiagnosticLink = {
  id: string;
  token: string;
  testTitle: string;
  psychologistName: string;
  createdAt: string;
  hasProgress?: boolean;
};

type RecommendationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  psychologistName: string;
};

export type DashboardData = {
  name: string;
  upcomingAppointments: number;
  upcomingAppointmentsList: AppointmentItem[];
  testResults: number;
  diagnosticResults: DiagnosticItem[];
  pendingDiagnosticLinks: PendingDiagnosticLink[];
  recommendations: RecommendationItem[];
};

function networkErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "Ошибка сети";
  if (
    msg.includes("fetch") ||
    msg.includes("Failed to fetch") ||
    msg.includes("CONNECTION_REFUSED")
  ) {
    return "Сервер недоступен (он мог завершиться при запросе к API). Запустите снова npm run dev и обновите страницу. Если используете Neon — проверьте, что база «разбужена» в консоли Neon.";
  }
  return msg;
}

export function useClientDashboard() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["client-dashboard"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/client/dashboard");
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = "/auth/login?callbackUrl=/client";
            throw new Error("Unauthorized");
          }
          if (res.status === 403) {
            window.location.href = "/?forbidden=1";
            throw new Error("Forbidden");
          }
          const body = await res.json().catch(() => ({}));
          throw new Error(
            typeof body?.error === "string" ? body.error : "Не удалось загрузить данные"
          );
        }
        return res.json();
      } catch (err) {
        if (err instanceof Error && (err.message === "Unauthorized" || err.message === "Forbidden")) {
          throw err;
        }
        throw new Error(networkErrorMessage(err));
      }
    },
    retry: false
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "SCHEDULED" | "CANCELED" }) => {
      const res = await fetch(`/api/client/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message ?? "Не удалось обновить запись");
      }
      return { id, status };
    },
    onSuccess: (_result, variables) => {
      const { id, status } = variables;
      queryClient.setQueryData<DashboardData>(["client-dashboard"], prev => {
        if (!prev) return prev;
        if (status === "CANCELED") {
          return {
            ...prev,
            upcomingAppointmentsList: prev.upcomingAppointmentsList.filter(a => a.id !== id),
            upcomingAppointments: Math.max(0, prev.upcomingAppointments - 1)
          };
        }
        return {
          ...prev,
          upcomingAppointmentsList: prev.upcomingAppointmentsList.map(a =>
            a.id === id ? { ...a, status: "SCHEDULED" } : a
          )
        };
      });
      toast.success(status === "CANCELED" ? "Запись отменена" : "Запись подтверждена");
    },
    onError: (e: Error) => {
      toast.error(e.message);
    }
  });

  const updateAppointment = useCallback(
    async (id: string, status: "SCHEDULED" | "CANCELED") => {
      await updateAppointmentMutation.mutateAsync({ id, status });
    },
    [updateAppointmentMutation]
  );

  const historyQuery = useQuery<AppointmentItem[]>({
    queryKey: ["client-appointments-history"],
    queryFn: async () => {
      const res = await fetch("/api/client/appointments?filter=past");
      if (!res.ok) {
        throw new Error("Не удалось загрузить историю");
      }
      const body = await res.json();
      if (!Array.isArray(body)) {
        throw new Error("Не удалось загрузить историю");
      }
      return body as AppointmentItem[];
    },
    enabled: false,
    staleTime: 5 * 60 * 1000
  });

  return {
    data: data ?? null,
    isLoading,
    error: error instanceof Error ? error.message : null,
    updateAppointment,
    isUpdatingAppointment: updateAppointmentMutation.isPending,
    loadHistory: () => {
      if (historyQuery.isFetching || historyQuery.data !== undefined) return;
      void historyQuery.refetch();
    },
    history: historyQuery.data ?? null,
    isHistoryLoading: historyQuery.isFetching
  };
}
