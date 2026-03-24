"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TimeInput } from "@/components/ui/time-input";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { ru } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";


type AppointmentStatus =
  | "PENDING_CONFIRMATION"
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELED"
  | "NO_SHOW";

type AppointmentDto = {
  id: string;
  start: string;
  end: string;
  status: AppointmentStatus;
  proposedByPsychologist?: boolean;
};

type Props = {
  clientId: string;
};

function formatDateRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const date = start.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  const startTime = start.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  });
  const endTime = end.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  });
  return `${date}, ${startTime}–${endTime}`;
}

function statusLabel(appointment: AppointmentDto, isPast: boolean, isNow: boolean) {
  switch (appointment.status) {
    case "PENDING_CONFIRMATION":
      return appointment.proposedByPsychologist
        ? "Ожидает подтверждения клиентом"
        : "Ожидает подтверждения";
    case "SCHEDULED":
      if (isPast) return "Состоялась";
      if (isNow) return "Идёт сейчас";
      return "Запланирован";
    case "COMPLETED":
      return "Состоялась";
    case "NO_SHOW":
      return "Клиент не явился";
    case "CANCELED":
      return "Отменена";
  }
}

function statusMarkerClasses(appointment: AppointmentDto, isPast: boolean) {
  if (appointment.status === "PENDING_CONFIRMATION") {
    return "border-l-4 border-l-[hsl(var(--status-warning))]";
  }
  if (appointment.status === "CANCELED" || appointment.status === "NO_SHOW") {
    return "border-l-4 border-l-destructive";
  }
  // SCHEDULED past или COMPLETED — состоялась
  if (isPast || appointment.status === "COMPLETED") {
    return "border-l-4 border-l-[hsl(var(--status-success))]";
  }
  return "border-l-4 border-l-[hsl(var(--status-success))]";
}

export function ClientAppointments({ clientId }: Props) {
  const [items, setItems] = useState<AppointmentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [createDate, setCreateDate] = useState<Date | undefined>(undefined);
  const [createTime, setCreateTime] = useState<string>("09:00");
  const [duration, setDuration] = useState(50);
  const [cancelPending, setCancelPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/psychologist/clients/${clientId}/appointments`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message ?? "Не удалось загрузить записи");
      }
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить записи"
      );
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleStatusChange(id: string, status: AppointmentStatus) {
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message ?? "Не удалось изменить статус записи");
      }
      setItems(prev =>
        prev.map(a => (a.id === id ? { ...a, status } : a))
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось изменить статус записи"
      );
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createDate) return;
    setCreating(true);
    setError(null);
    try {
      const [hours, minutes] = createTime.split(":").map(Number);
      const start = new Date(createDate);
      start.setHours(hours ?? 0, minutes ?? 0, 0, 0);
      const res = await fetch(`/api/psychologist/clients/${clientId}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: start.toISOString(),
          durationMinutes: duration
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message ?? "Не удалось предложить запись");
      }
      setItems(prev =>
        [data as AppointmentDto, ...prev].sort((a, b) =>
          a.start < b.start ? 1 : a.start > b.start ? -1 : 0
        )
      );
      setCreateDate(undefined);
      setCreateTime("09:00");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Не удалось предложить запись"
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-3 rounded-md border bg-background/40 p-3 text-xs md:flex-row md:items-end"
      >
        <div className="space-y-1 flex-1">
          <Label className="text-sm">Дата</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                type="button"
                className="h-9 w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground"
                data-empty={!createDate}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-50" />
                {createDate ? (
                  createDate.toLocaleDateString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                  })
                ) : (
                  <span>Выберите дату</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto border-none bg-transparent p-0 shadow-none"
              align="start"
            >
              <Calendar
                mode="single"
                selected={createDate}
                onSelect={setCreateDate}
                locale={ru}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Время</Label>
          <TimeInput value={createTime} onChange={setCreateTime} />
        </div>
        <div className="space-y-1 w-full md:w-32">
          <Label className="text-sm">Длительность, минут</Label>
          <Select
            value={String(duration)}
            onValueChange={value => setDuration(Number(value))}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="60">60</SelectItem>
              <SelectItem value="90">90</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          type="submit"
          size="sm"
          className="mt-1 h-9 md:mt-0"
          disabled={creating || !createDate}
        >
          {creating ? "Отправляем..." : "Предложить запись"}
        </Button>
      </form>

      {error && (
        <div className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
          {error}
        </div>
      )}

      {loading && items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Загружаем записи...</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Записей с этим клиентом пока нет.
        </p>
      ) : (
        (() => {
          const now = Date.now();
          const upcoming = items
            .filter(i => new Date(i.end).getTime() >= now)
            .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
          const past = items
            .filter(i => new Date(i.end).getTime() < now)
            .sort((a, b) => (a.start < b.start ? 1 : a.start > b.start ? -1 : 0));

          const renderItem = (item: AppointmentDto) => {
            const endTime = new Date(item.end).getTime();
            const startTime = new Date(item.start).getTime();
            const isPast = endTime < now;
            const isNow = startTime <= now && now <= endTime;

            return (
              <li
                key={item.id}
                className={`flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 ${statusMarkerClasses(item, isPast)}`}
              >
                <div className="space-y-0.5">
                  <div className="font-medium">
                    {formatDateRange(item.start, item.end)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {statusLabel(item, isPast, isNow)}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {/* Предстоящие: ожидает подтверждения — клиент записался сам */}
                  {!isPast && item.status === "PENDING_CONFIRMATION" && !item.proposedByPsychologist && (
                    <>
                      <Button size="sm" className="text-sm" variant="default"
                        onClick={() => handleStatusChange(item.id, "SCHEDULED")}>
                        Подтвердить
                      </Button>
                      <Button size="sm" className="text-sm" variant="outline"
                        onClick={() => setCancelPending(item.id)}>
                        Отменить
                      </Button>
                    </>
                  )}

                  {/* Предстоящие: психолог предложил, ждём устного подтверждения клиента */}
                  {!isPast && item.status === "PENDING_CONFIRMATION" && item.proposedByPsychologist && (
                    <>
                      <Button size="sm" className="text-sm" variant="default"
                        onClick={() => handleStatusChange(item.id, "SCHEDULED")}>
                        Клиент подтвердил
                      </Button>
                      <Button size="sm" className="text-sm" variant="outline"
                        onClick={() => setCancelPending(item.id)}>
                        Отменить
                      </Button>
                    </>
                  )}

                  {/* Предстоящие: запланирован */}
                  {!isPast && item.status === "SCHEDULED" && (
                    <Button size="sm" className="text-sm" variant="outline"
                      onClick={() => setCancelPending(item.id)}>
                      Отменить
                    </Button>
                  )}

                  {/* История: SCHEDULED или COMPLETED — считается состоявшейся, можно скорректировать */}
                  {isPast && (item.status === "SCHEDULED" || item.status === "COMPLETED") && (
                    <>
                      <Button size="sm" className="text-sm" variant="outline"
                        onClick={() => handleStatusChange(item.id, "NO_SHOW")}>
                        Клиент не явился
                      </Button>
                      <Button size="sm" className="text-sm" variant="ghost"
                        onClick={() => setCancelPending(item.id)}>
                        Отменена
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          };

          return (
            <div className="space-y-4 text-xs">
              {upcoming.length > 0 && (
                <ul className="space-y-2">{upcoming.map(renderItem)}</ul>
              )}
              {upcoming.length === 0 && past.length > 0 && (
                <p className="text-xs text-muted-foreground">Предстоящих записей нет.</p>
              )}
              {past.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">История</p>
                  <ul className="space-y-2">{past.map(renderItem)}</ul>
                </div>
              )}
            </div>
          );
        })()
      )}

      <AlertDialog
        open={!!cancelPending}
        onOpenChange={open => { if (!open) setCancelPending(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отменить запись?</AlertDialogTitle>
            <AlertDialogDescription>
              Запись будет отменена.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Нет</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cancelPending) {
                  void handleStatusChange(cancelPending, "CANCELED");
                  setCancelPending(null);
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
