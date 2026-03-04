"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

type AppointmentDto = {
  id: string;
  start: string;
  end: string;
  status: "PENDING_CONFIRMATION" | "SCHEDULED" | "COMPLETED" | "CANCELED";
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

function statusLabel(status: AppointmentDto["status"]) {
  switch (status) {
    case "PENDING_CONFIRMATION":
      return "Ожидает подтверждения";
    case "SCHEDULED":
      return "Запланирован";
    case "COMPLETED":
      return "Завершён";
    case "CANCELED":
      return "Отменён";
  }
}

export function ClientAppointments({ clientId }: Props) {
  const [items, setItems] = useState<AppointmentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [createDate, setCreateDate] = useState<Date | undefined>(undefined);
  const [createTime, setCreateTime] = useState<string | undefined>(undefined);
  const [duration, setDuration] = useState(50);

  async function load() {
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
  }

  useEffect(() => {
    void load();
  }, [clientId]);

  async function handleStatusChange(id: string, status: AppointmentDto["status"]) {
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
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
    if (!createDate || !createTime) return;
    setCreating(true);
    setError(null);
    try {
      const [hours, minutes] = createTime.split(":").map(Number);
      const start = new Date(createDate);
      start.setHours(hours ?? 0, minutes ?? 0, 0, 0);
      const res = await fetch(`/api/psychologist/clients/${clientId}/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
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
      setCreateTime(undefined);
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
          <Label className="text-[11px]">Дата</Label>
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
        <div className="space-y-1 w-full md:w-32">
          <Label className="text-[11px]">Время</Label>
          <Select
            value={createTime}
            onValueChange={value => setCreateTime(value)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Выбрать" />
            </SelectTrigger>
            <SelectContent>
              {[
                "08:00",
                "08:30",
                "09:00",
                "09:30",
                "10:00",
                "10:30",
                "11:00",
                "11:30",
                "12:00",
                "12:30",
                "13:00",
                "13:30",
                "14:00",
                "14:30",
                "15:00",
                "15:30",
                "16:00",
                "16:30",
                "17:00",
                "17:30",
                "18:00"
              ].map(t => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 w-full md:w-32">
          <Label className="text-[11px]">Длительность, минут</Label>
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
          disabled={creating || !createDate || !createTime}
        >
          {creating ? "Отправляем..." : "Предложить запись"}
        </Button>
      </form>

      {error && (
        <div className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-[11px] text-destructive-foreground">
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
        <ul className="space-y-2 text-xs">
          {items.map(item => {
            const start = new Date(item.start);
            const isFuture = start.getTime() > Date.now();

            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2"
              >
                <div className="space-y-0.5">
                  <div className="font-medium">
                    {formatDateRange(item.start, item.end)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {statusLabel(item.status)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.status === "PENDING_CONFIRMATION" && (
                    <>
                      {!item.proposedByPsychologist && (
                        <Button
                          size="sm"
                          className="text-[11px]"
                          variant="default"
                          onClick={() => handleStatusChange(item.id, "SCHEDULED")}
                        >
                          Подтвердить
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="text-[11px]"
                        variant="outline"
                        onClick={() => handleStatusChange(item.id, "CANCELED")}
                      >
                        Отменить
                      </Button>
                    </>
                  )}
                  {item.status === "SCHEDULED" && isFuture && (
                    <Button
                      size="sm"
                      className="text-[11px]"
                      variant="outline"
                      onClick={() => handleStatusChange(item.id, "CANCELED")}
                    >
                      Отменить
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

