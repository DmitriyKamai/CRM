"use client";

import { useEffect } from "react";
import { Bell, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchNotifications,
  markNotificationRead,
  removeNotification,
  clearAllNotifications,
  setPanelOpen,
  selectUnreadCount
} from "@/store/slices/notifications.slice";

export type { NotificationItem } from "@/store/slices/notifications.slice";

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined
  });
}

export function NotificationsPanel() {
  const dispatch = useAppDispatch();
  const items = useAppSelector(state => state.notifications.items);
  const open = useAppSelector(state => state.notifications.panelOpen);
  const unreadCount = useAppSelector(selectUnreadCount);

  useEffect(() => {
    void dispatch(fetchNotifications());
  }, [dispatch]);

  useEffect(() => {
    if (!open) return;
    void dispatch(fetchNotifications());
  }, [open, dispatch]);

  return (
    <Popover open={open} onOpenChange={value => dispatch(setPanelOpen(value))}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Уведомления"
        >
          <Bell className="h-4 w-4" />
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
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => void dispatch(clearAllNotifications(items.map(n => n.id)))}
            >
              Очистить все
            </Button>
          )}
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Нет уведомлений
            </div>
          ) : (
            <ul className="divide-y">
              {items.map(n => (
                <li
                  key={n.id}
                  className={cn(
                    "group flex items-start gap-2 px-3 py-2.5 text-left transition-colors",
                    !n.read && "bg-muted/50"
                  )}
                >
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      if (!n.read) void dispatch(markNotificationRead(n.id));
                    }}
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
                    onClick={e => {
                      e.stopPropagation();
                      void dispatch(removeNotification(n.id));
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
