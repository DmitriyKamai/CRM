"use client";

import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

import type {
  AppointmentItem,
  AppointmentStatus,
  DashboardData
} from "@/hooks/use-client-dashboard";

type AppointmentsTabProps = {
  data: DashboardData;
  updateAppointment: (id: string, status: "SCHEDULED" | "CANCELED") => Promise<void>;
  loadHistory: () => void;
  history: AppointmentItem[] | null;
  isHistoryLoading: boolean;
};

function formatAppointmentDateTime(start: string, end: string): string {
  const d = new Date(start);
  const e = new Date(end);
  const date = d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  const timeStart = d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  });
  const timeEnd = e.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  });
  return `${date}, ${timeStart}–${timeEnd}`;
}

export function AppointmentsTab({
  data,
  updateAppointment,
  loadHistory,
  history,
  isHistoryLoading
}: AppointmentsTabProps) {
  const [cancelPendingId, setCancelPendingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleUpdate(id: string, status: "SCHEDULED" | "CANCELED") {
    setUpdatingId(id);
    try {
      await updateAppointment(id, status);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {data.upcomingAppointmentsList.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            У вас пока нет предстоящих записей.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ближайшие записи</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="space-y-2">
              {data.upcomingAppointmentsList.map(apt => (
                <li
                  key={apt.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm"
                >
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-medium text-foreground">{apt.psychologistName}</span>
                      {apt.status === "PENDING_CONFIRMATION" && (
                        <span className="rounded bg-amber-500/15 px-2 py-0.5 text-sm text-amber-900 dark:text-amber-200">
                          Ожидает подтверждения
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatAppointmentDateTime(apt.start, apt.end)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {apt.status === "PENDING_CONFIRMATION" && apt.proposedByPsychologist && (
                      <Button
                        size="sm"
                        className="h-8 text-sm"
                        disabled={updatingId === apt.id}
                        onClick={() => void handleUpdate(apt.id, "SCHEDULED")}
                      >
                        Подтвердить
                      </Button>
                    )}
                    {(apt.status === "PENDING_CONFIRMATION" || apt.status === "SCHEDULED") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-sm"
                        disabled={updatingId === apt.id}
                        onClick={() => setCancelPendingId(apt.id)}
                      >
                        Отменить
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div>
        {history === null ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => loadHistory()}
            disabled={isHistoryLoading}
          >
            {isHistoryLoading ? "Загрузка…" : "Показать историю записей"}
          </Button>
        ) : history.length === 0 ? (
          <p className="text-xs text-muted-foreground">История записей пуста.</p>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">История записей</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ul className="space-y-2">
                {history.map(apt => {
                  const statusLabel: Record<AppointmentStatus, string> = {
                    SCHEDULED: "Ожидает нового статуса",
                    COMPLETED: "Состоялась",
                    CANCELED: "Отменена",
                    NO_SHOW: "Не состоялась",
                    PENDING_CONFIRMATION: "Ожидала подтверждения"
                  };
                  const statusColor: Record<AppointmentStatus, string> = {
                    SCHEDULED: "text-blue-600 dark:text-blue-400",
                    COMPLETED: "text-emerald-600 dark:text-emerald-400",
                    CANCELED: "text-muted-foreground line-through",
                    NO_SHOW: "text-destructive",
                    PENDING_CONFIRMATION: "text-muted-foreground"
                  };
                  return (
                    <li
                      key={apt.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
                    >
                      <div className="space-y-0.5">
                        <span className="font-medium text-foreground">{apt.psychologistName}</span>
                        <div className="text-xs text-muted-foreground">
                          {formatAppointmentDateTime(apt.start, apt.end)}
                        </div>
                      </div>
                      <span className={`text-xs ${statusColor[apt.status]}`}>
                        {statusLabel[apt.status]}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog
        open={!!cancelPendingId}
        onOpenChange={open => {
          if (!open) setCancelPendingId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отменить запись?</AlertDialogTitle>
            <AlertDialogDescription>
              Запись будет отменена. Слот освободится.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Нет</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cancelPendingId) {
                  void handleUpdate(cancelPendingId, "CANCELED");
                  setCancelPendingId(null);
                }
              }}
            >
              Да, отменить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
