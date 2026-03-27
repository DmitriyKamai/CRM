"use client";

import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  useCalendarFeedUrlQuery,
  useRotateCalendarFeedUrlMutation
} from "@/hooks/use-calendar-feed-url";

/** Перевыпуск секретной ссылки ICS (вкладка «Безопасность»). */
export function CalendarFeedTokenRotateSection() {
  const query = useCalendarFeedUrlQuery();
  const rotate = useRotateCalendarFeedUrlMutation();

  async function handleRotate() {
    try {
      await rotate.mutateAsync();
      toast.success(
        "Ссылка обновлена. Подключите календарь заново в Google и Apple — прежний URL больше не действует."
      );
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Не удалось перевыпустить ссылку"
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm space-y-3 text-sm">
      <p className="text-muted-foreground leading-relaxed">
        Если секретную ссылку на календарь мог увидеть кто-то посторонний, перевыпустите токен.
        Старый адрес перестанет открываться — добавьте подписку снова из вкладки «Календарь» или со
        страницы расписания.
      </p>

      {query.isError && (
        <p className="text-destructive">
          {query.error instanceof Error
            ? query.error.message
            : "Не удалось загрузить данные ссылки"}
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={rotate.isPending || query.isLoading}
        onClick={() => void handleRotate()}
      >
        <RefreshCw
          className={`mr-2 h-4 w-4 ${rotate.isPending ? "animate-spin" : ""}`}
          aria-hidden
        />
        {rotate.isPending ? "Обновление…" : "Перевыпустить ссылку на календарь"}
      </Button>
    </div>
  );
}
