"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TimeInput } from "@/components/ui/time-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import type { ClientOption } from "@/lib/schedule-utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDateTime: Date | null;
  clients: ClientOption[];
  clientsLoading: boolean;
  onCreated: (params: { clientId?: string; start: string; durationMinutes: number }) => Promise<void>;
};

export function CreateAppointmentDialog({
  open,
  onOpenChange,
  initialDateTime,
  clients,
  clientsLoading,
  onCreated
}: Props) {
  const [dateTime, setDateTime] = useState<Date | null>(initialDateTime);
  const [clientId, setClientId] = useState<string | undefined>(undefined);
  const [duration, setDuration] = useState(50);
  const [creating, setCreating] = useState(false);

  const prevInitialRef = useState<Date | null>(null);
  if (initialDateTime !== prevInitialRef[0]) {
    prevInitialRef[1](initialDateTime);
    if (initialDateTime) {
      setDateTime(initialDateTime);
      setClientId(undefined);
      setDuration(50);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dateTime) return;
    setCreating(true);
    try {
      await onCreated({
        clientId,
        start: dateTime.toISOString(),
        durationMinutes: duration
      });
      toast.success(clientId ? "Запись предложена клиенту." : "Свободный слот создан.");
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Не удалось создать запись";
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        onOpenChange(v);
        if (!v) setDateTime(null);
      }}
    >
      <DialogContent className="max-w-md" onOpenAutoFocus={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Новая запись</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="min-w-0 space-y-4 text-sm">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Дата</Label>
            <p className="text-sm font-medium">
              {dateTime
                ? dateTime.toLocaleDateString("ru-RU", {
                    weekday: "long",
                    day: "numeric",
                    month: "long"
                  })
                : "Не выбрана"}
            </p>
          </div>
          <div className="flex min-w-0 w-full flex-col gap-1">
            <Label className="text-xs">Время начала</Label>
            <TimeInput
              value={
                dateTime
                  ? `${String(dateTime.getHours()).padStart(2, "0")}:${String(dateTime.getMinutes()).padStart(2, "0")}`
                  : "09:00"
              }
              onChange={timeStr => {
                const [h, m] = timeStr.split(":").map(Number);
                const dt = new Date(dateTime ?? Date.now());
                dt.setHours(h ?? 0, m ?? 0, 0, 0);
                setDateTime(dt);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Клиент (необязательно)</Label>
            <Select
              value={clientId ?? "none"}
              onValueChange={v => setClientId(v === "none" ? undefined : v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue
                  placeholder={clientsLoading ? "Загрузка..." : "Не выбран (будет свободный слот)"}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без клиента (свободный слот)</SelectItem>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.lastName} {c.firstName}
                    {c.hasAccount === false && " (без аккаунта)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Длительность, минут</Label>
            <Select
              value={String(duration)}
              onValueChange={v => setDuration(Number(v))}
            >
              <SelectTrigger className="h-9 text-sm">
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
          <DialogFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" size="sm" disabled={!dateTime || creating}>
              {creating ? "Создаём..." : "Создать запись"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
