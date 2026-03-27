"use client";

import {
  Calendar,
  Copy,
  ExternalLink,
  RefreshCw,
  Smartphone
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useCalendarFeedUrlQuery,
  useRotateCalendarFeedUrlMutation
} from "@/hooks/use-calendar-feed-url";
import {
  toGoogleCalendarSubscribeUrl,
  toWebCalSubscribeUrl
} from "@/lib/calendar-subscription-links";

function formatLastFetchHint(iso: string | null): string {
  if (!iso) {
    return "Запросов к фиду от внешнего календаря пока не было. После подписки Google и Apple обновляют данные с задержкой — иногда до нескольких часов.";
  }
  const d = new Date(iso);
  const formatted = d.toLocaleString("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  });
  return `Последний запрос к фиду со стороны календаря: ${formatted}.`;
}

export function CalendarSubscriptionBlock(props: {
  /** Внутри сворачиваемого блока на странице расписания — без внешней Card. */
  variant?: "default" | "embedded";
}) {
  const { variant = "default" } = props;
  const query = useCalendarFeedUrlQuery();
  const rotate = useRotateCalendarFeedUrlMutation();

  const url = query.data?.url ?? null;
  const lastFetchedAt = query.data?.lastFetchedAt ?? null;

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Ссылка скопирована");
    } catch {
      toast.error("Не удалось скопировать");
    }
  }

  async function handleRotate() {
    try {
      await rotate.mutateAsync();
      toast.success(
        "Ссылка обновлена. Добавьте в календарь новый URL — старый перестанет работать."
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось перевыпустить ссылку");
    }
  }

  const content = (
    <>
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Calendar className="h-4 w-4 shrink-0" />
        Подписка на календарь
      </div>
      <p className="text-xs text-muted-foreground">
        Слоты и записи подтягиваются в Google Calendar или Календарь Apple. Достаточно один раз
        подписаться — дальше обновления идут автоматически.
      </p>
      <p className="text-xs text-amber-600 dark:text-amber-500/90">
        Любой, у кого есть ссылка, увидит расписание. Если ссылку могли увидеть посторонние —
        нажмите «Новая ссылка».
      </p>

      {query.isLoading && (
        <p className="text-xs text-muted-foreground">Загрузка ссылки…</p>
      )}

      {query.isError && (
        <div className="space-y-2">
          <p className="text-xs text-destructive">
            {query.error instanceof Error
              ? query.error.message
              : "Не удалось загрузить ссылку"}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
          >
            Повторить
          </Button>
        </div>
      )}

      {url && !query.isLoading && (
        <>
          <div
            className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
            role="status"
          >
            {formatLastFetchHint(lastFetchedAt)}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button type="button" size="sm" className="justify-start gap-2" asChild>
              <a
                href={toGoogleCalendarSubscribeUrl(url)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                Подписаться в Google Календаре
              </a>
            </Button>
            <Button type="button" size="sm" variant="secondary" className="justify-start gap-2" asChild>
              <a href={toWebCalSubscribeUrl(url)}>
                <Smartphone className="h-4 w-4 shrink-0" />
                Подписаться в Apple Календаре
              </a>
            </Button>
            <Button type="button" size="sm" variant="outline" className="justify-start gap-2" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer" download>
                <Calendar className="h-4 w-4 shrink-0" />
                Скачать .ics
              </a>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              readOnly
              value={url}
              className="h-9 min-w-0 flex-1 rounded-md border border-input bg-muted/50 px-3 font-mono text-xs text-muted-foreground"
              aria-label="Ссылка на календарь для ручной вставки"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => void handleCopy()}
            >
              <Copy className="mr-1 h-4 w-4" />
              Копировать URL
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => void handleRotate()}
              disabled={rotate.isPending}
            >
              <RefreshCw
                className={`mr-1 h-4 w-4 ${rotate.isPending ? "animate-spin" : ""}`}
              />
              {rotate.isPending ? "Обновление…" : "Новая ссылка"}
            </Button>
          </div>

          {url.includes("localhost") && (
            <p className="text-xs text-muted-foreground">
              С localhost внешние календари не подключатся — после публикации используйте ссылку с
              вашего домена.
            </p>
          )}
        </>
      )}
    </>
  );

  if (variant === "embedded") {
    return (
      <div className="space-y-3 rounded-lg border border-border/80 bg-background/60 px-3 py-3">
        {content}
      </div>
    );
  }

  return (
    <Card className="border-border/80">
      <CardContent className="space-y-3 px-4 py-3">{content}</CardContent>
    </Card>
  );
}
