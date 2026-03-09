"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type TelegramStatus = {
  linked: boolean;
  username?: string;
};

export function TelegramAccountBlock() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkResult, setLinkResult] = useState<{ link: string; expiresIn: number } | null>(null);
  const [unlinkLoading, setUnlinkLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/user/telegram");
      if (!res.ok) return;
      const data = await res.json();
      setStatus({ linked: !!data.linked, username: data.username });
      if (data.linked) setLinkResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleLink = async () => {
    setLinkLoading(true);
    setLinkResult(null);
    try {
      const res = await fetch("/api/user/telegram/link", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Не удалось создать ссылку");
        return;
      }
      if (data.link) {
        setLinkResult({ link: data.link, expiresIn: data.expiresIn ?? 600 });
        window.open(data.link, "_blank", "noopener,noreferrer");
        toast.success("Откройте бота в Telegram и нажмите «Старт». Ссылка действительна 10 минут.");
      } else {
        toast.error("Не настроен TELEGRAM_BOT_USERNAME. Добавьте его в .env");
      }
    } finally {
      setLinkLoading(false);
    }
  };

  const handleUnlink = async () => {
    setUnlinkLoading(true);
    try {
      const res = await fetch("/api/user/telegram", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || "Не удалось отвязать");
        return;
      }
      setStatus({ linked: false });
      setLinkResult(null);
      toast.success("Telegram отвязан");
    } finally {
      setUnlinkLoading(false);
    }
  };

  const refreshAfterLink = () => {
    fetchStatus();
  };

  if (loading) {
    return (
      <span className="inline-flex items-center rounded-md bg-muted px-3 py-1.5 text-xs font-medium">
        Загрузка…
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status?.linked ? (
        <>
          <span className="inline-flex items-center rounded-md bg-muted px-3 py-1.5 text-xs font-medium">
            <span className="mr-1 inline-flex h-3 w-3 items-center justify-center text-sky-500">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3">
                <path
                  d="M21.7 4.3c-.3-.2-.7-.3-1.1-.2L3.6 10c-.4.1-.8.5-.8.9-.1.4.2.9.6 1.1l3.9 1.5 1.5 4c.1.4.5.7 1 .8h.2c.4 0 .8-.3 1-.6l2-3.2 3.9 3.1c.2.2.5.3.8.3.1 0 .3 0 .4-.1.4-.1.7-.4.8-.8l2.2-11.8c.1-.4-.1-.8-.3-1.1z"
                  fill="currentColor"
                />
              </svg>
            </span>
            Telegram привязан{status.username ? ` (@${status.username})` : ""}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={unlinkLoading}
            onClick={handleUnlink}
          >
            {unlinkLoading ? "Отвязка…" : "Отвязать"}
          </Button>
        </>
      ) : (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={linkLoading}
            onClick={handleLink}
          >
            <span className="flex items-center gap-1">
              <span className="inline-flex h-3 w-3 items-center justify-center text-sky-500">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3">
                  <path
                    d="M21.7 4.3c-.3-.2-.7-.3-1.1-.2L3.6 10c-.4.1-.8.5-.8.9-.1.4.2.9.6 1.1l3.9 1.5 1.5 4c.1.4.5.7 1 .8h.2c.4 0 .8-.3 1-.6l2-3.2 3.9 3.1c.2.2.5.3.8.3.1 0 .3 0 .4-.1.4-.1.7-.4.8-.8l2.2-11.8c.1-.4-.1-.8-.3-1.1z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span>{linkLoading ? "Создание ссылки…" : "Привязать Telegram"}</span>
            </span>
          </Button>
          {linkResult && (
            <>
              <span className="text-xs text-muted-foreground">
                Ссылка действительна {Math.floor(linkResult.expiresIn / 60)} мин
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={refreshAfterLink}
              >
                Я привязал(а) — обновить
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
