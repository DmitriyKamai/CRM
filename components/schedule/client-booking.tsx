"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SlotDto {
  id: string;
  start: string;
  end: string;
}

interface Props {
  psychologistId: string;
  psychologistName: string;
}

export function ClientBooking({ psychologistId, psychologistName }: Props) {
  const [slots, setSlots] = useState<SlotDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);

  async function loadSlots() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/schedule/psychologists/${psychologistId}/slots`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.message ?? "Не удалось загрузить свободные слоты"
        );
      }
      const data = (await res.json()) as SlotDto[];
      setSlots(data);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось загрузить свободные слоты"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [psychologistId]);

  async function handleBook(slotId: string) {
    setBookingId(slotId);
    setError(null);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ slotId })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message ?? "Не удалось создать запись");
      }
      // Удаляем слот из списка после успешной записи
      setSlots(prev => prev.filter(s => s.id !== slotId));
      setBookingId(null);
      toast.success("Запись успешно создана.");
    } catch (err) {
      console.error(err);
      setBookingId(null);
      setError(
        err instanceof Error ? err.message : "Не удалось создать запись"
      );
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Запись к психологу {psychologistName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Выберите удобный свободный слот для записи на приём.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Свободные слоты</CardTitle>
          <Button variant="ghost" size="sm" onClick={loadSlots}>
            Обновить
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-sm text-muted-foreground">
              Загружаем слоты...
            </div>
          ) : slots.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Свободных слотов пока нет. Попробуйте позже или свяжитесь с
              психологом напрямую.
            </div>
          ) : (
            <div className="space-y-2 text-xs text-foreground">
              {slots.map(slot => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2"
                >
                  <div>
                    {new Date(slot.start).toLocaleString("ru-RU", {
                      dateStyle: "short",
                      timeStyle: "short"
                    })}{" "}
                    —{" "}
                    {new Date(slot.end).toLocaleTimeString("ru-RU", {
                      timeStyle: "short"
                    })}
                  </div>
                  <Button
                    size="sm"
                    disabled={bookingId === slot.id}
                    onClick={() => handleBook(slot.id)}
                  >
                    {bookingId === slot.id ? "Записываем..." : "Записаться"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

