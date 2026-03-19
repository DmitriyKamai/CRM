"use client";

import { useState } from "react";
import { Copy, Calendar, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function CalendarSubscriptionBlock() {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function handleLoadUrl() {
    if (loaded || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/calendar/feed-url");
      const data = (await (res.ok ? res.json() : Promise.reject(new Error("Ошибка")))) as { url?: string };
      if (data.url) {
        setUrl(data.url);
        setLoaded(true);
      } else {
        setUrl(null);
      }
    } catch {
      setUrl(null);
    } finally {
      setLoading(false);
    }
  }

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
    if (rotating) return;
    setRotating(true);
    try {
      const res = await fetch("/api/calendar/feed-url", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string; message?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.message ?? "Ошибка");
      }
      setUrl(data.url);
      toast.success("Ссылка обновлена. Добавьте новую в календарь — старая больше не будет работать.");
    } catch {
      toast.error("Не удалось перевыпустить ссылку");
    } finally {
      setRotating(false);
    }
  }

  if (!loaded && !url) {
    return (
      <Card className="border-border/80">
        <CardContent className="py-3 px-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            Подписка на календарь
          </div>
          <p className="text-xs text-muted-foreground">
            Добавьте ссылку в Google Calendar или Apple Calendar (подписка по URL), чтобы видеть расписание в своём календаре.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLoadUrl}
            disabled={loading}
          >
            {loading ? "Загрузка…" : "Загрузить ссылку"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading && !url) {
    return (
      <Card className="border-border/80">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>Подготовка ссылки…</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!url) {
    return null;
  }

  return (
    <Card className="border-border/80">
      <CardContent className="py-3 px-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Calendar className="h-4 w-4 shrink-0" />
          Подписка на календарь
        </div>
        <p className="text-xs text-muted-foreground">
          Добавьте ссылку в Google Calendar или Apple Calendar (подписка по URL), чтобы видеть расписание в своём календаре.
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-500/90">
          К расписанию по этой ссылке может подключиться любой, кто её знает. Если ссылку могли увидеть посторонние — нажмите «Новая ссылка» и укажите в календаре уже новый URL подписки.
        </p>
        <div className="flex gap-2 items-center flex-wrap">
          <input
            type="text"
            readOnly
            value={url}
            className="flex-1 min-w-0 h-9 rounded-md border border-input bg-muted/50 px-3 text-xs font-mono text-muted-foreground"
            aria-label="Ссылка на календарь"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={handleCopy}
          >
            <Copy className="h-4 w-4 mr-1" />
            Копировать
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={handleRotate}
            disabled={rotating}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${rotating ? "animate-spin" : ""}`} />
            {rotating ? "Обновление…" : "Новая ссылка"}
          </Button>
        </div>
        {url.includes("localhost") && (
          <p className="text-xs text-muted-foreground">
            Ссылка с localhost не подойдёт для Google Calendar — после публикации сайта используйте ссылку с вашего домена.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
