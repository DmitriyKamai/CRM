"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { signOutIfSessionInvalid } from "@/lib/session-stale-client";

export const CALENDAR_FEED_URL_QUERY_KEY = ["calendar-feed-url"] as const;

export type CalendarFeedUrlData = {
  url: string;
  lastFetchedAt: string | null;
  createdAt: string | null;
};

async function fetchCalendarFeedUrl(): Promise<CalendarFeedUrlData> {
  const res = await fetch("/api/calendar/feed-url");
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    if (await signOutIfSessionInvalid(res.status, body)) {
      throw new Error("Сессия недействительна");
    }
    let msg = "Не удалось получить ссылку на календарь";
    if (body && typeof body === "object" && body !== null) {
      const m = (body as { message?: unknown }).message;
      if (typeof m === "string") msg = m;
    }
    throw new Error(msg);
  }
  const data = body as {
    url?: string;
    lastFetchedAt?: string | null;
    createdAt?: string | null;
  };
  if (!data.url || typeof data.url !== "string") {
    throw new Error("Некорректный ответ сервера");
  }
  return {
    url: data.url,
    lastFetchedAt:
      typeof data.lastFetchedAt === "string" ? data.lastFetchedAt : null,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : null
  };
}

async function rotateCalendarFeedUrl(): Promise<CalendarFeedUrlData> {
  const res = await fetch("/api/calendar/feed-url", { method: "POST" });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    if (await signOutIfSessionInvalid(res.status, body)) {
      throw new Error("Сессия недействительна");
    }
    let msg = "Не удалось обновить ссылку";
    if (body && typeof body === "object" && body !== null) {
      const m = (body as { message?: unknown }).message;
      if (typeof m === "string") msg = m;
    }
    throw new Error(msg);
  }
  const data = body as {
    url?: string;
    lastFetchedAt?: string | null;
    createdAt?: string | null;
  };
  if (!data.url || typeof data.url !== "string") {
    throw new Error("Некорректный ответ сервера");
  }
  return {
    url: data.url,
    lastFetchedAt:
      typeof data.lastFetchedAt === "string" ? data.lastFetchedAt : null,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : null
  };
}

export function useCalendarFeedUrlQuery(enabled = true) {
  return useQuery({
    queryKey: CALENDAR_FEED_URL_QUERY_KEY,
    queryFn: fetchCalendarFeedUrl,
    enabled,
    staleTime: 30_000,
    retry: 2,
    retryDelay: 500
  });
}

export function useRotateCalendarFeedUrlMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rotateCalendarFeedUrl,
    onSuccess: (data) => {
      qc.setQueryData(CALENDAR_FEED_URL_QUERY_KEY, data);
    }
  });
}
