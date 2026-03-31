"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type LoginSessionRow = {
  id: string;
  browser: string | null;
  os: string | null;
  deviceLabel: string | null;
  deviceFormFactor: "desktop" | "mobile" | "tablet" | "unknown";
  country: string | null;
  city: string | null;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
};

async function fetchLoginSessions(): Promise<{ sessions: LoginSessionRow[] }> {
  const res = await fetch("/api/auth/login-sessions");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Ошибка загрузки");
  }
  return res.json() as Promise<{ sessions: LoginSessionRow[] }>;
}

async function postRevokeOthers(): Promise<{ revokedCount: number }> {
  const res = await fetch("/api/auth/login-sessions/revoke-others", {
    method: "POST"
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Ошибка");
  }
  return res.json() as Promise<{ revokedCount: number }>;
}

export function useLoginSessions(enabled: boolean) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["auth", "login-sessions"],
    queryFn: fetchLoginSessions,
    enabled
  });

  const revokeMutation = useMutation({
    mutationFn: postRevokeOthers,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["auth", "login-sessions"] });
    }
  });

  return { ...query, revokeMutation };
}
