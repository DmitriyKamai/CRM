"use client";

import { Button } from "@/components/ui/button";
import { OAuthAppleIcon, OAuthGoogleIcon } from "@/components/auth/oauth-brand-icons";
import { useCalendarFeedUrlQuery } from "@/hooks/use-calendar-feed-url";
import {
  toGoogleCalendarSubscribeUrl,
  toWebCalSubscribeUrl
} from "@/lib/calendar-subscription-links";
import { cn } from "@/lib/utils";

/** Блок подписки ICS для страницы расписания: заголовок и две кнопки (без карточки настроек). */
export function ScheduleCalendarSubscription({ className }: { className?: string }) {
  const query = useCalendarFeedUrlQuery();
  const url = query.data?.url ?? null;

  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      <h3 className="text-sm font-semibold text-foreground">Подписка на календарь</h3>

      {query.isLoading && (
        <p className="text-xs text-muted-foreground">Подготовка ссылки…</p>
      )}

      {query.isError && (
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-xs text-destructive">
            {query.error instanceof Error
              ? query.error.message
              : "Не удалось загрузить ссылку"}
          </p>
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => void query.refetch()}>
            Повторить
          </Button>
        </div>
      )}

      {url && !query.isLoading && (
        <div className="flex min-w-0 flex-col gap-2">
          <Button type="button" variant="outline" size="sm" className="h-9 w-full min-w-0 justify-center gap-2 px-2" asChild>
            <a href={toGoogleCalendarSubscribeUrl(url)} target="_blank" rel="noopener noreferrer">
              <OAuthGoogleIcon />
              <span className="truncate">Подписаться в Google</span>
            </a>
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-9 w-full min-w-0 justify-center gap-2 px-2" asChild>
            <a href={toWebCalSubscribeUrl(url)}>
              <OAuthAppleIcon />
              <span className="truncate">Подписаться в Apple</span>
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
