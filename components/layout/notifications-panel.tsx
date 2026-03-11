"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
};

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = list.filter((n) => !n.read).length;

  function fetchList() {
    return fetch("/api/notifications")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: NotificationItem[]) => setList(Array.isArray(data) ? data : []))
      .catch(() => setList([]));
  }

  // Загрузка при монтировании — чтобы отображать счётчик непрочитанных
  useEffect(() => {
    fetchList();
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchList().finally(() => setLoading(false));
  }, [open]);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true })
    });
    setList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  async function remove(id: string) {
    const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setList((prev) => prev.filter((n) => n.id !== id));
  }

  async function clearAll() {
    if (list.length === 0) return;
    const ids = list.map(n => n.id);
    setList([]);
    await Promise.all(
      ids.map(id =>
        fetch(`/api/notifications/${id}`, { method: "DELETE" }).catch(() => {})
      )
    );
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (sameDay) {
      return d.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    return d.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full"
          aria-label="Уведомления"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-sm font-medium text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="border-b px-3 py-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Уведомления</h3>
          {list.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={clearAll}
            >
              Очистить все
            </Button>
          )}
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {loading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Загрузка…
            </div>
          ) : list.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Нет уведомлений
            </div>
          ) : (
            <ul className="divide-y">
              {list.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "group flex items-start gap-2 px-3 py-2.5 text-left transition-colors",
                    !n.read && "bg-muted/50"
                  )}
                >
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => !n.read && markRead(n.id)}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p
                        className={cn(
                          "truncate text-sm font-medium",
                          !n.read ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {n.title}
                      </p>
                      <span
                        className={cn(
                          "shrink-0 text-sm font-medium",
                          !n.read ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {formatDate(n.createdAt)}
                      </span>
                    </div>
                    {n.body && (
                      <p className="mt-0.5 text-xs text-muted-foreground whitespace-pre-line">
                        {n.body}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 opacity-60 hover:opacity-100"
                    aria-label="Удалить"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(n.id);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
