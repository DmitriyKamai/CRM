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
      <span className="inline-flex items-center rounded-lg bg-muted px-4 py-2.5 text-sm font-medium">
        Загрузка…
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status?.linked ? (
        <>
          <span className="inline-flex min-w-0 items-center gap-2 rounded-lg bg-muted px-4 py-2.5 text-sm font-medium">
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                className="h-5 w-5"
              >
                <path
                  fill="#29b6f6"
                  d="M24 4A20 20 0 1 0 24 44A20 20 0 1 0 24 4Z"
                />
                <path
                  fill="#fff"
                  d="M33.95,15l-3.746,19.126c0,0-0.161,0.874-1.245,0.874c-0.576,0-0.873-0.274-0.873-0.274l-8.114-6.733 l-3.97-2.001l-5.095-1.355c0,0-0.907-0.262-0.907-1.012c0-0.625,0.933-0.923,0.933-0.923l21.316-8.468 c-0.001-0.001,0.651-0.235,1.126-0.234C33.667,14,34,14.125,34,14.5C34,14.75,33.95,15,33.95,15z"
                />
                <path
                  fill="#b0bec5"
                  d="M23,30.505l-3.426,3.374c0,0-0.149,0.115-0.348,0.12c-0.069,0.002-0.143-0.009-0.219-0.043 l0.964-5.965L23,30.505z"
                />
                <path
                  fill="#cfd8dc"
                  d="M29.897,18.196c-0.169-0.22-0.481-0.26-0.701-0.093L16,26c0,0,2.106,5.892,2.427,6.912 c0.322,1.021,0.58,1.045,0.58,1.045l0.964-5.965l9.832-9.096C30.023,18.729,30.064,18.416,29.897,18.196z"
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
            <span className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  className="h-5 w-5"
                >
                  <path
                    fill="#29b6f6"
                    d="M24 4A20 20 0 1 0 24 44A20 20 0 1 0 24 4Z"
                  />
                  <path
                    fill="#fff"
                    d="M33.95,15l-3.746,19.126c0,0-0.161,0.874-1.245,0.874c-0.576,0-0.873-0.274-0.873-0.274l-8.114-6.733 l-3.97-2.001l-5.095-1.355c0,0-0.907-0.262-0.907-1.012c0-0.625,0.933-0.923,0.933-0.923l21.316-8.468 c-0.001-0.001,0.651-0.235,1.126-0.234C33.667,14,34,14.125,34,14.5C34,14.75,33.95,15,33.95,15z"
                  />
                  <path
                    fill="#b0bec5"
                    d="M23,30.505l-3.426,3.374c0,0-0.149,0.115-0.348,0.12c-0.069,0.002-0.143-0.009-0.219-0.043 l0.964-5.965L23,30.505z"
                  />
                  <path
                    fill="#cfd8dc"
                    d="M29.897,18.196c-0.169-0.22-0.481-0.26-0.701-0.093L16,26c0,0,2.106,5.892,2.427,6.912 c0.322,1.021,0.58,1.045,0.58,1.045l0.964-5.965l9.832-9.096C30.023,18.729,30.064,18.416,29.897,18.196z"
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
