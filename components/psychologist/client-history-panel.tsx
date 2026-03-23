"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  ClipboardList,
  FileDown,
  FileUp,
  History,
  Link2,
  Stethoscope,
  UserMinus,
  UserPlus,
  Pencil,
  RefreshCw
} from "lucide-react";

import { cn } from "@/lib/utils";

type HistoryEventRow = {
  id: string;
  createdAt: string;
  type: string;
  meta: unknown;
  actorName: string | null;
  actorEmail: string | null;
};

function appointmentStatusLabel(code: string): string {
  const m: Record<string, string> = {
    PENDING_CONFIRMATION: "Ожидает подтверждения",
    SCHEDULED: "Подтверждена",
    COMPLETED: "Завершена",
    CANCELED: "Отменена"
  };
  return m[code] ?? code;
}

function diagnosticTestLabel(code: string): string {
  const m: Record<string, string> = {
    SMIL: "СМИЛ",
    SHMISHEK: "Шмишек",
    PAVLOVA_SHMISHEK: "Павлова (Шмишек)"
  };
  return m[code] ?? code;
}

function formatEventLine(row: HistoryEventRow): { title: string; detail?: string } {
  const meta = (row.meta && typeof row.meta === "object" ? row.meta : {}) as Record<
    string,
    unknown
  >;

  switch (row.type) {
    case "CLIENT_CREATED": {
      const src = meta.source === "import" ? "импорт" : "вручную";
      return { title: "Клиент добавлен", detail: `Источник: ${src}` };
    }
    case "PROFILE_UPDATED": {
      const changes = meta.changes as { label?: string; from?: string; to?: string }[] | undefined;
      if (Array.isArray(changes) && changes.length > 0) {
        const parts = changes
          .slice(0, 4)
          .map((c) => `${c.label ?? "Поле"}: «${c.from ?? "—"}» → «${c.to ?? "—"}»`);
        const more =
          changes.length > 4 ? ` и ещё ${changes.length - 4}` : "";
        return { title: "Изменены данные профиля", detail: parts.join("; ") + more };
      }
      return { title: "Изменены данные профиля" };
    }
    case "STATUS_CHANGED": {
      const from = typeof meta.fromLabel === "string" ? meta.fromLabel : "—";
      const to = typeof meta.toLabel === "string" ? meta.toLabel : "—";
      return { title: "Изменён статус клиента", detail: `${from} → ${to}` };
    }
    case "REMOVED_FROM_LIST": {
      const bulk = meta.mode === "bulk_detach";
      return {
        title: "Клиент убран из вашего списка",
        detail: bulk ? "Массовое удаление" : undefined
      };
    }
    case "CUSTOM_FIELDS_UPDATED": {
      const changes = meta.changes as
        | { label?: string; from?: string; to?: string }[]
        | undefined;
      if (Array.isArray(changes) && changes.length > 0) {
        const parts = changes
          .slice(0, 6)
          .map((c) => `${c.label ?? "Поле"}: «${c.from ?? "—"}» → «${c.to ?? "—"}»`);
        const more =
          changes.length > 6 ? ` и ещё ${changes.length - 6}` : "";
        return {
          title: "Изменены дополнительные поля",
          detail: parts.join("; ") + more
        };
      }
      const n = typeof meta.fieldCount === "number" ? meta.fieldCount : 0;
      return {
        title: "Изменены дополнительные поля",
        detail: n > 0 ? `Полей: ${n}` : undefined
      };
    }
    case "DIAGNOSTIC_LINK_CREATED": {
      const tt = typeof meta.testType === "string" ? diagnosticTestLabel(meta.testType) : "тест";
      return { title: "Создана ссылка на диагностику", detail: tt };
    }
    case "DIAGNOSTIC_COMPLETED": {
      const title =
        typeof meta.testTitle === "string" ? meta.testTitle : "Диагностика";
      const tt = typeof meta.testType === "string" ? diagnosticTestLabel(meta.testType) : "";
      return {
        title: "Пройдена диагностика",
        detail: tt ? `${title} (${tt})` : title
      };
    }
    case "APPOINTMENT_STATUS_CHANGED": {
      const from = typeof meta.fromStatus === "string" ? appointmentStatusLabel(meta.fromStatus) : "—";
      const to = typeof meta.toStatus === "string" ? appointmentStatusLabel(meta.toStatus) : "—";
      let detail = `${from} → ${to}`;
      if (typeof meta.start === "string") {
        try {
          const d = new Date(meta.start);
          if (!Number.isNaN(d.getTime())) {
            detail += ` · ${d.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}`;
          }
        } catch {
          /* ignore */
        }
      }
      return { title: "Изменён статус записи на приём", detail };
    }
    case "FILE_UPLOADED": {
      const fn = typeof meta.filename === "string" ? meta.filename : "файл";
      return { title: "Загружен файл", detail: fn };
    }
    case "FILE_DELETED": {
      return { title: "Удалён файл" };
    }
    default:
      return { title: row.type };
  }
}

function iconForType(type: string) {
  switch (type) {
    case "CLIENT_CREATED":
      return UserPlus;
    case "PROFILE_UPDATED":
      return Pencil;
    case "STATUS_CHANGED":
      return RefreshCw;
    case "REMOVED_FROM_LIST":
      return UserMinus;
    case "CUSTOM_FIELDS_UPDATED":
      return ClipboardList;
    case "DIAGNOSTIC_LINK_CREATED":
      return Link2;
    case "DIAGNOSTIC_COMPLETED":
      return Stethoscope;
    case "APPOINTMENT_STATUS_CHANGED":
      return CalendarClock;
    case "FILE_UPLOADED":
      return FileUp;
    case "FILE_DELETED":
      return FileDown;
    default:
      return History;
  }
}

export function ClientHistoryPanel({
  clientId,
  refreshKey,
  className
}: {
  clientId: string;
  refreshKey?: number;
  className?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<HistoryEventRow[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/psychologist/clients/${clientId}/history`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Не удалось загрузить"))))
      .then((data: { events?: HistoryEventRow[] }) => {
        setRows(Array.isArray(data?.events) ? data.events : []);
      })
      .catch(() => {
        setError("Не удалось загрузить историю");
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => {
    queueMicrotask(() => {
      load();
    });
  }, [load, refreshKey]);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card",
        /* dvh — видимая область; min(…rem) — потолок по высоте, чтобы не вылезать за низ main */
        "min-h-[12rem] max-h-[min(28rem,52dvh)] lg:max-h-[min(32rem,52dvh)]",
        className
      )}
    >
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2.5">
        <History className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium">История</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 [-webkit-overflow-scrolling:touch]">
        {loading ? (
          <p className="text-sm text-muted-foreground">Загрузка…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Пока нет событий. Новые действия по клиенту будут отображаться здесь.
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => {
              const { title, detail } = formatEventLine(row);
              const Icon = iconForType(row.type);
              const when = new Date(row.createdAt);
              const actor =
                row.actorName?.trim() ||
                row.actorEmail?.trim() ||
                null;
              return (
                <li key={row.id} className="flex gap-2 text-sm">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-xs text-muted-foreground">
                      {Number.isNaN(when.getTime())
                        ? "—"
                        : when.toLocaleString("ru-RU", {
                            dateStyle: "short",
                            timeStyle: "short"
                          })}
                      {actor ? ` · ${actor}` : ""}
                    </p>
                    <p className="font-medium leading-snug">{title}</p>
                    {detail && (
                      <p className="text-xs text-muted-foreground break-words whitespace-pre-wrap">
                        {detail}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
