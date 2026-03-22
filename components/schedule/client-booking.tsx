"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface SlotDto {
  id: string;
  start: string;
  end: string;
}

interface Props {
  psychologistId: string;
  /** Имя для редких подсказок / ошибок; в заголовке не дублируем */
  psychologistName: string;
}

export function ClientBooking({ psychologistId, psychologistName }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [slots, setSlots] = useState<SlotDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const isLoggedIn = status === "authenticated" && !!session?.user;
  const loginUrl = `/auth/login?callbackUrl=${encodeURIComponent(`/client/psychologists/${psychologistId}`)}`;

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

  function handleBookClick(slotId: string) {
    if (!isLoggedIn) {
      router.push(loginUrl);
      return;
    }
    handleBook(slotId);
  }

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
    <Card id="booking" className="overflow-hidden rounded-2xl shadow-sm">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-xl font-semibold tracking-tight">
          Запись на приём
        </CardTitle>
        <CardDescription>
          Выберите свободный слот. После выбора система предложит войти в аккаунт,
          если вы ещё не авторизованы.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Свободные окна у <span className="font-medium text-foreground">{psychologistName}</span>
          </p>
          <Button variant="outline" size="sm" onClick={loadSlots} className="shrink-0">
            Обновить список
          </Button>
        </div>

        <Separator />

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg sm:max-w-md" />
          </div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Свободных слотов пока нет. Попробуйте позже или свяжитесь с психологом
            напрямую.
          </p>
        ) : (
          <ul className="space-y-2">
            {slots.map(slot => (
              <li
                key={slot.id}
                className="flex flex-col gap-3 rounded-xl border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="text-sm font-medium tabular-nums text-foreground">
                  {new Date(slot.start).toLocaleString("ru-RU", {
                    dateStyle: "short",
                    timeStyle: "short"
                  })}{" "}
                  <span className="font-normal text-muted-foreground">—</span>{" "}
                  {new Date(slot.end).toLocaleTimeString("ru-RU", {
                    timeStyle: "short"
                  })}
                </div>
                <Button
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={bookingId === slot.id}
                  onClick={() => handleBookClick(slot.id)}
                >
                  {bookingId === slot.id ? "Записываем..." : "Записаться"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

