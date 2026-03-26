"use client";

import { useQuery } from "@tanstack/react-query";

export const GOOGLE_SHEETS_STATUS_QUERY_KEY = ["psychologist-google-sheets-status"] as const;

export async function fetchGoogleSheetsStatus(): Promise<{
  oauthConfigured: boolean;
  googleConnected: boolean;
}> {
  try {
    const res = await fetch("/api/psychologist/google-sheets");
    if (!res.ok) return { oauthConfigured: false, googleConnected: false };
    const data = (await res.json().catch(() => null)) as {
      oauthConfigured?: boolean;
      googleConnected?: boolean;
    } | null;
    return {
      oauthConfigured: Boolean(data?.oauthConfigured),
      googleConnected: Boolean(data?.googleConnected)
    };
  } catch {
    return { oauthConfigured: false, googleConnected: false };
  }
}

export function useGoogleSheetsStatus() {
  const { data, isPending, refetch } = useQuery({
    queryKey: GOOGLE_SHEETS_STATUS_QUERY_KEY,
    queryFn: fetchGoogleSheetsStatus,
    staleTime: 5 * 60 * 1000,
    refetchOnReconnect: false
  });

  return {
    oauthConfigured: data === undefined ? null : data.oauthConfigured,
    googleConnected: data === undefined ? null : data.googleConnected,
    isPending,
    refetchGoogleSheetsStatus: () => refetch().then(() => undefined)
  };
}
