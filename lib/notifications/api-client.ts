import type { NotificationItem } from "@/lib/notifications/types";

export async function fetchNotificationsList(): Promise<NotificationItem[]> {
  const res = await fetch("/api/notifications");
  if (!res.ok) return [];
  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as NotificationItem[]) : [];
}

export async function patchNotificationRead(id: string, read: boolean): Promise<void> {
  const res = await fetch(`/api/notifications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ read })
  });
  if (!res.ok) throw new Error("Не удалось обновить уведомление");
}

export async function deleteNotification(id: string): Promise<void> {
  const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Не удалось удалить уведомление");
}

export async function deleteNotificationsBatch(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteNotification(id).catch(() => {})));
}
