"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  fetchGoogleSheetsStatus,
  GOOGLE_SHEETS_STATUS_QUERY_KEY
} from "@/hooks/use-google-sheets-status";

export function useClientsExport(opts: {
  clientsCount: number;
  statusFilter: string;
  googleSheetsOAuthConfigured: boolean | null;
  googleSheetsGoogleConnected: boolean | null;
  syncGoogleSheetsFromServer: () => Promise<void>;
  setError?: (v: string | null) => void;
}) {
  const qc = useQueryClient();
  const {
    clientsCount,
    statusFilter,
    googleSheetsOAuthConfigured,
    googleSheetsGoogleConnected,
    syncGoogleSheetsFromServer,
    setError
  } = opts;

  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(
    async (format: "csv" | "json" | "xlsx") => {
      setExporting(true);
      try {
        const params = new URLSearchParams({ format });
        if (statusFilter !== "ALL") params.set("statusId", statusFilter);
        const res = await fetch(`/api/psychologist/clients/export?${params.toString()}`);
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message ?? "Не удалось выгрузить список");
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const d = new Date();
        const dateStr = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
        a.download = `clients-${dateStr}.${format === "xlsx" ? "xlsx" : format}`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error(err);
        setError?.(err instanceof Error ? err.message : "Ошибка экспорта");
      } finally {
        setExporting(false);
      }
    },
    [setError, statusFilter]
  );

  const handleExportGoogleSheets = useCallback(async (opts?: { forceRefreshStatus?: boolean }) => {
    if (clientsCount === 0) return;

    let oauthOk = googleSheetsOAuthConfigured;
    let connected = googleSheetsGoogleConnected;

    if (opts?.forceRefreshStatus || oauthOk === null || connected === null) {
      const fresh = await qc.fetchQuery({
        queryKey: GOOGLE_SHEETS_STATUS_QUERY_KEY,
        queryFn: fetchGoogleSheetsStatus
      });
      oauthOk = fresh.oauthConfigured;
      connected = fresh.googleConnected;
    }

    if (!oauthOk) {
      toast.error(
        "Google для таблиц не настроен на сервере. Нужны GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET — обратитесь к администратору."
      );
      return;
    }

    if (!connected) {
      window.location.assign("/api/psychologist/google-sheets/oauth/start?intent=export");
      return;
    }

    setExporting(true);
    try {
      const body: { statusId?: string } = {};
      if (statusFilter !== "ALL") body.statusId = statusFilter;

      const res = await fetch("/api/psychologist/clients/export/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = (await res.json().catch(() => null)) as {
        message?: string;
        spreadsheetUrl?: string;
        exportedCount?: number;
      } | null;
      if (!res.ok) {
        if (res.status === 403) {
          await qc.invalidateQueries({ queryKey: GOOGLE_SHEETS_STATUS_QUERY_KEY });
          const fresh = await qc.fetchQuery({
            queryKey: GOOGLE_SHEETS_STATUS_QUERY_KEY,
            queryFn: fetchGoogleSheetsStatus
          });
          // Если Google был отключён между кликами, сразу запускаем OAuth на этом же нажатии.
          if (fresh.oauthConfigured && !fresh.googleConnected) {
            window.location.assign("/api/psychologist/google-sheets/oauth/start?intent=export");
            return;
          }
        }
        throw new Error(data?.message ?? "Не удалось выгрузить в Google Таблицу");
      }
      await syncGoogleSheetsFromServer();
      const n = data?.exportedCount ?? 0;
      toast.success(
        n > 0
          ? `Создана новая таблица, выгружено строк: ${n}. Открываем…`
          : "Создана новая таблица (только заголовки — нет клиентов по фильтру). Открываем…"
      );
      if (data?.spreadsheetUrl) {
        window.open(data.spreadsheetUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Ошибка выгрузки в Google");
    } finally {
      setExporting(false);
    }
  }, [
    clientsCount,
    googleSheetsGoogleConnected,
    googleSheetsOAuthConfigured,
    qc,
    statusFilter,
    syncGoogleSheetsFromServer
  ]);

  return {
    exporting,
    handleExport,
    handleExportGoogleSheets
  };
}

export type UseClientsExportReturn = ReturnType<typeof useClientsExport>;

