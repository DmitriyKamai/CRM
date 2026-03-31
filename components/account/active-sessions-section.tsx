"use client";

import { useEffect } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2, Monitor, Smartphone, Tablet } from "lucide-react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import type { LoginSessionRow } from "@/hooks/use-login-sessions";
import { useLoginSessions } from "@/hooks/use-login-sessions";

const GEO_ENRICH_STORAGE_PREFIX = "empatix_login_geo_enrich:";

type Props = {
  /** Загружать список только когда вкладка открыта. */
  active: boolean;
};

function formatLocation(country: string | null, city: string | null): string {
  const parts = [city, country].filter(Boolean);
  return parts.length ? parts.join(", ") : "Местоположение не определено";
}

const formFactorMeta: Record<
  LoginSessionRow["deviceFormFactor"],
  { label: string; Icon: typeof Monitor }
> = {
  desktop: { label: "Компьютер", Icon: Monitor },
  mobile: { label: "Телефон", Icon: Smartphone },
  tablet: { label: "Планшет", Icon: Tablet },
  unknown: { label: "Устройство", Icon: Monitor }
};

export function ActiveSessionsSection({ active }: Props) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const userId =
    session?.user && "id" in session.user && session.user.id
      ? session.user.id
      : undefined;

  useEffect(() => {
    if (!active || !userId) return;

    const storageKey = `${GEO_ENRICH_STORAGE_PREFIX}${userId}`;
    try {
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(storageKey)) {
        return;
      }
    } catch {
      /* sessionStorage недоступен */
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/login-sessions/enrich-geo", {
          method: "POST"
        });
        if (cancelled) return;
        if (res.ok) {
          try {
            if (typeof sessionStorage !== "undefined") {
              sessionStorage.setItem(storageKey, "1");
            }
          } catch {
            /* ignore */
          }
          const body = (await res.json().catch(() => ({}))) as { updated?: boolean };
          if (body.updated) {
            void queryClient.invalidateQueries({ queryKey: ["auth", "login-sessions"] });
          }
        }
      } catch {
        /* сеть — повторим при следующем открытии вкладки */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, userId, queryClient]);

  const { data, isLoading, isError, error, refetch, revokeMutation } =
    useLoginSessions(active);

  const sessions = data?.sessions ?? [];
  const othersCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Устройства, с которых выполнен вход. Завершение остальных сессий не затронет
        текущий браузер.
      </p>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка…
        </div>
      )}

      {isError && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Не удалось загрузить список"}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            Повторить
          </Button>
        </div>
      )}

      {!isLoading && !isError && sessions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Активных сессий пока нет. Они появятся после следующего входа.
        </p>
      )}

      {!isLoading && !isError && sessions.length > 0 && (
        <ul className="space-y-3">
          {sessions.map((s) => {
            const { label, Icon } = formFactorMeta[s.deviceFormFactor];
            return (
            <li
              key={s.id}
              className="flex flex-col gap-1 rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex gap-3 min-w-0">
                <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
                  <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground text-center max-w-[4.5rem] leading-tight">
                    {label}
                  </span>
                </div>
                <div className="min-w-0 space-y-0.5 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {s.deviceLabel ?? "Браузер"}
                    {s.isCurrent && (
                      <span className="ml-2 text-xs font-normal text-emerald-600 dark:text-emerald-400">
                        текущая сессия
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatLocation(s.country, s.city)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Последняя активность:{" "}
                    {format(new Date(s.lastSeenAt), "d MMM yyyy, HH:mm", { locale: ru })}
                  </p>
                </div>
              </div>
            </li>
            );
          })}
        </ul>
      )}

      {!isLoading && !isError && othersCount > 0 && (
        <Button
          type="button"
          variant="secondary"
          disabled={revokeMutation.isPending}
          onClick={() => void revokeMutation.mutateAsync()}
        >
          {revokeMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Завершение…
            </>
          ) : (
            `Завершить остальные (${othersCount})`
          )}
        </Button>
      )}

      {revokeMutation.isError && (
        <p className="text-sm text-destructive">
          {revokeMutation.error instanceof Error
            ? revokeMutation.error.message
            : "Не удалось завершить сессии"}
        </p>
      )}

      {revokeMutation.isSuccess && revokeMutation.data.revokedCount > 0 && (
        <p className="text-sm text-muted-foreground">
          Завершено сессий: {revokeMutation.data.revokedCount}
        </p>
      )}
    </div>
  );
}
