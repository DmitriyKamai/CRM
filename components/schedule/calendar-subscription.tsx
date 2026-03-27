"use client";

import { Button } from "@/components/ui/button";
import { OAuthAppleIcon, OAuthGoogleIcon } from "@/components/auth/oauth-brand-icons";
import { useCalendarFeedUrlQuery } from "@/hooks/use-calendar-feed-url";
import {
  toGoogleCalendarSubscribeUrl,
  toWebCalSubscribeUrl
} from "@/lib/calendar-subscription-links";

/** Контент вкладки «Календарь» без своей карточки — заголовок задаётся в `Section` родителя. */
export function CalendarSubscriptionBlock() {
  const query = useCalendarFeedUrlQuery();
  const url = query.data?.url ?? null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Слоты и записи подтягиваются в Google Calendar или Календарь Apple. Достаточно один раз
        подписаться — дальше обновления идут автоматически.
      </p>

      {query.isLoading && (
        <p className="text-sm text-muted-foreground">Подготовка ссылки…</p>
      )}

      {query.isError && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <p className="text-sm text-destructive">
            {query.error instanceof Error
              ? query.error.message
              : "Не удалось загрузить ссылку"}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>
            Повторить
          </Button>
        </div>
      )}

      {url && !query.isLoading && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" className="h-10 w-full justify-center gap-2" asChild>
            <a href={toGoogleCalendarSubscribeUrl(url)} target="_blank" rel="noopener noreferrer">
              <OAuthGoogleIcon />
              <span>Подписаться в Google</span>
            </a>
          </Button>
          <Button type="button" variant="outline" className="h-10 w-full justify-center gap-2" asChild>
            <a href={toWebCalSubscribeUrl(url)}>
              <OAuthAppleIcon />
              <span>Подписаться в Apple</span>
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
