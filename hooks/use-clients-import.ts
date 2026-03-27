"use client";

import type { ChangeEvent, RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { openGoogleSheetsPicker } from "@/lib/google-sheet-picker-client";

export type ClientsImportField = { key: string; label: string };
export type ClientsImportCustomDef = { id: string; label: string };

export type ClientsImportResult = {
  created: number;
  updated?: number;
  skipped: number;
  failed: number;
  errors: { row: number; message: string }[];
  warnings?: { row: number; message: string }[];
};

function detectCsvDelimiter(firstLine: string): string {
  let comma = 0;
  let semi = 0;
  let tab = 0;
  let inQuotes = false;
  for (let i = 0; i < firstLine.length; i++) {
    const c = firstLine[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes) {
      if (c === ",") comma++;
      else if (c === ";") semi++;
      else if (c === "\t") tab++;
    }
  }
  const max = Math.max(comma, semi, tab);
  if (max === 0) return ",";
  if (semi === max) return ";";
  if (tab === max) return "\t";
  return ",";
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let i = 0;
  const delim = delimiter.slice(0, 1);
  while (i < line.length) {
    if (line[i] === '"') {
      let cell = "";
      i++;
      while (i < line.length) {
        if (line[i] === '"') {
          i++;
          if (line[i] === '"') {
            cell += '"';
            i++;
          } else break;
        } else {
          cell += line[i];
          i++;
        }
      }
      out.push(cell);
      if (i < line.length && line[i] === delim) i++;
    } else {
      let cell = "";
      while (i < line.length && line[i] !== delim) {
        cell += line[i];
        i++;
      }
      out.push(cell.trim());
      if (i < line.length && line[i] === delim) i++;
    }
  }
  return out;
}

type GsJson = {
  oauthConfigured?: boolean;
  googleConnected?: boolean;
  spreadsheetId?: string | null;
};

export function useClientsImport(opts: {
  importFields: ClientsImportField[];
  importOpen: boolean;
  setImportOpen: (v: boolean) => void;
  importCustomDefs: ClientsImportCustomDef[];
  setImportCustomDefs: (v: ClientsImportCustomDef[]) => void;
  onImported?: () => void | Promise<void>;
  setGlobalError?: (v: string | null) => void;
  pathname: string;
  routerReplace: (url: string, opts?: { scroll?: boolean }) => void;
  searchParamsToString: () => string;
}) {
  const {
    importFields,
    importOpen,
    setImportOpen,
    importCustomDefs,
    setImportCustomDefs,
    onImported,
    setGlobalError,
    pathname,
    routerReplace,
    searchParamsToString
  } = opts;

  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<(string | number | boolean)[][]>([]);
  const [importMapping, setImportMapping] = useState<Record<string, number>>({});
  const [importSkipDuplicates, setImportSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ClientsImportResult | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);

  const importFileInputRef = useRef<HTMLInputElement>(null);
  const resumeImportWithoutResetRef = useRef(false);
  const skipGoogleSheetsProfileUrlOnceRef = useRef(false);
  const handledOAuthQueryRef = useRef<string | null>(null);

  const [googleSheetsImportUrl, setGoogleSheetsImportUrl] = useState("");
  const [googleSheetsImportLoading, setGoogleSheetsImportLoading] = useState(false);
  const [googleSheetsPickerLoading, setGoogleSheetsPickerLoading] = useState(false);
  const [googleSheetsOAuthConfigured, setGoogleSheetsOAuthConfigured] = useState<boolean | null>(null);
  const [googleSheetsGoogleConnected, setGoogleSheetsGoogleConnected] = useState<boolean | null>(null);

  const syncGoogleSheetsFromServer = useCallback(
    async (fillImportUrl: boolean) => {
      try {
        const res = await fetch("/api/psychologist/google-sheets");
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as GsJson | null;
        setGoogleSheetsOAuthConfigured(Boolean(data?.oauthConfigured));
        const connected = Boolean(data?.googleConnected);
        setGoogleSheetsGoogleConnected(connected);
        const sid =
          typeof data?.spreadsheetId === "string" && data.spreadsheetId.trim()
            ? data.spreadsheetId.trim()
            : null;
        if (fillImportUrl) {
          if (skipGoogleSheetsProfileUrlOnceRef.current) {
            skipGoogleSheetsProfileUrlOnceRef.current = false;
          } else if (connected && sid) {
            setGoogleSheetsImportUrl(`https://docs.google.com/spreadsheets/d/${sid}/edit`);
          }
        }
      } catch {
        setGoogleSheetsOAuthConfigured(false);
        setGoogleSheetsGoogleConnected(false);
      }
    },
    []
  );

  useEffect(() => {
    void syncGoogleSheetsFromServer(false);
  }, [syncGoogleSheetsFromServer]);

  useEffect(() => {
    const qs = searchParamsToString();
    const sp = new URLSearchParams(qs);
    const v = sp.get("sheet_oauth");
    const openImport = sp.get("openImport") === "1";
    const sheetIntent = sp.get("sheet_intent");
    if (!v && !openImport) return;
    if (handledOAuthQueryRef.current === qs) return;
    handledOAuthQueryRef.current = qs;

    if (openImport) setImportOpen(true);

    if (v === "ok" && sheetIntent === "export") {
      // Экспортный OAuth-сценарий обрабатывает оркестратор clients-list.tsx.
      return;
    } else if (v === "ok") {
      toast.success("Google подключён: можно загружать данные из Google Таблицы для импорта");
    } else if (v === "access_denied") {
      toast.error(
        "Доступ не выдан (часто это режим «Тестирование» в Google Cloud). Добавьте этот Google-аккаунт в список тестовых пользователей: APIs & Services → OAuth consent screen → Test users, либо опубликуйте приложение.",
        { duration: 12000 }
      );
    } else if (v === "denied") {
      toast.error("Доступ к Google не выдан");
    } else if (v === "norefresh") {
      toast.error(
        "Google не выдал долгоживущий токен. Откройте настройки аккаунта Google → безопасность → доступ приложений, отзовите CRM и подключите снова."
      );
    } else if (v === "invalid") {
      toast.error("Ошибка авторизации");
    } else if (v) {
      toast.error("Не удалось подключить Google");
    }

    sp.delete("sheet_oauth");
    sp.delete("openImport");
    sp.delete("sheet_intent");
    const next = sp.toString();
    routerReplace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [pathname, routerReplace, searchParamsToString, setImportOpen]);

  useEffect(() => {
    if (!importOpen) return;
    if (resumeImportWithoutResetRef.current) {
      resumeImportWithoutResetRef.current = false;
      async function loadDefsOnly() {
        try {
          const res = await fetch("/api/psychologist/custom-fields");
          if (!res.ok) return;
          const data = await res.json().catch(() => null);
          const items = data?.items ?? [];
          setImportCustomDefs(
            items.map((d: { id: string; label: string }) => ({ id: d.id, label: d.label }))
          );
        } catch (err) {
          console.error(err);
        }
      }
      void loadDefsOnly();
      void syncGoogleSheetsFromServer(false);
      return;
    }

    setImportResult(null);
    setImportFileName(null);
    setImportHeaders([]);
    setImportRows([]);
    setImportMapping({});
    setGoogleSheetsImportUrl("");
    async function load() {
      try {
        const res = await fetch("/api/psychologist/custom-fields");
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        const items = data?.items ?? [];
        setImportCustomDefs(items.map((d: { id: string; label: string }) => ({ id: d.id, label: d.label })));
      } catch (err) {
        console.error(err);
      }
    }
    void load();
  }, [importOpen, setImportCustomDefs, syncGoogleSheetsFromServer]);

  useEffect(() => {
    if (!importOpen) return;
    void syncGoogleSheetsFromServer(true);
  }, [importOpen, syncGoogleSheetsFromServer]);

  useEffect(() => {
    if (!importOpen) return;
    function onWindowFocus() {
      if (importFileInputRef.current && document.activeElement === importFileInputRef.current) {
        importFileInputRef.current.blur();
      }
    }
    window.addEventListener("focus", onWindowFocus);
    return () => window.removeEventListener("focus", onWindowFocus);
  }, [importOpen]);

  const handleImportFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImportFileName(file.name);
      const name = file.name.toLowerCase();
      try {
        if (name.endsWith(".json")) {
          const text = await file.text();
          const arr = JSON.parse(text) as Record<string, unknown>[];
          if (!Array.isArray(arr) || arr.length === 0) {
            setImportHeaders([]);
            setImportRows([]);
            return;
          }
          const skipKeys = new Set(["customFields", "id", "createdAt"]);
          const headers = Array.from(
            new Set(arr.flatMap((o) => Object.keys(o).filter((k) => !skipKeys.has(k))))
          );
          const customKeys = Array.from(
            new Set(
              arr.flatMap((o) =>
                Object.keys((o as { customFields?: Record<string, unknown> }).customFields ?? {})
              )
            )
          );
          const allHeaders = [...headers, ...customKeys];
          const rows = arr.map((obj) => {
            const cf = (obj as { customFields?: Record<string, unknown> }).customFields ?? {};
            return allHeaders.map((h) => {
              if (cf[h] !== undefined) return cf[h] as string | number | boolean;
              const v = (obj as Record<string, unknown>)[h];
              if (v instanceof Date) return v.toISOString();
              return (v ?? "") as string | number | boolean;
            });
          });
          const nextMapping: Record<string, number> = {};
          allHeaders.forEach((h, idx) => {
            const base = importFields.find((f) => f.label === h);
            if (base) nextMapping[base.key] = idx;
            const custom = importCustomDefs.find((d) => d.label === h);
            if (custom) nextMapping[`custom:${custom.label}`] = idx;
          });
          setImportHeaders(allHeaders);
          setImportRows(rows);
          setImportMapping(nextMapping);
          return;
        }
        if (name.endsWith(".csv")) {
          const text = await file.text();
          const lines = text
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .split("\n")
            .filter((l) => l.trim());
          if (lines.length === 0) {
            setImportHeaders([]);
            setImportRows([]);
            return;
          }
          const delimiter = detectCsvDelimiter(lines[0]);
          const headers = parseCSVLine(lines[0], delimiter);
          const rows = lines.slice(1).map((l) => parseCSVLine(l, delimiter));
          const nextMapping: Record<string, number> = {};
          headers.forEach((h, idx) => {
            const base = importFields.find((f) => f.label === h);
            if (base) nextMapping[base.key] = idx;
            const custom = importCustomDefs.find((d) => d.label === h);
            if (custom) nextMapping[`custom:${custom.label}`] = idx;
          });
          setImportHeaders(headers);
          setImportRows(rows);
          setImportMapping(nextMapping);
          return;
        }
        if (name.endsWith(".xlsx")) {
          const { parseXlsxFirstSheetToAoA } = await import("@/lib/clients-xlsx-parse");
          const buf = await file.arrayBuffer();
          const data = await parseXlsxFirstSheetToAoA(buf);
          if (!data.length) {
            setImportHeaders([]);
            setImportRows([]);
            return;
          }
          const headers = (data[0] ?? []).map(String);
          const rows = (data.slice(1) as (string | number)[][]).filter((r) =>
            r.some((c) => c != null && String(c).trim() !== "")
          );
          const nextMapping: Record<string, number> = {};
          headers.forEach((h, idx) => {
            const base = importFields.find((f) => f.label === h);
            if (base) nextMapping[base.key] = idx;
            const custom = importCustomDefs.find((d) => d.label === h);
            if (custom) nextMapping[`custom:${custom.label}`] = idx;
          });
          setImportHeaders(headers);
          setImportRows(rows);
          setImportMapping(nextMapping);
        }
      } catch (err) {
        console.error(err);
        setGlobalError?.("Не удалось прочитать файл");
      }
    },
    [importCustomDefs, importFields, setGlobalError]
  );

  const resetImportSourceSelection = useCallback(() => {
    setImportHeaders([]);
    setImportRows([]);
    setImportMapping({});
    setImportFileName(null);
    setImportResult(null);
    if (importFileInputRef.current) importFileInputRef.current.value = "";
  }, []);

  const loadGoogleSheetsTableIntoImport = useCallback(
    async (spreadsheetUrlOrId: string) => {
      const trimmed = spreadsheetUrlOrId.trim();
      if (!trimmed) {
        toast.error("Укажите ссылку на таблицу");
        return;
      }
      setGoogleSheetsImportLoading(true);
      setGlobalError?.(null);
      try {
        const res = await fetch("/api/psychologist/clients/import/google-sheets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            spreadsheetUrlOrId: trimmed
          })
        });
        const data = (await res.json().catch(() => null)) as {
          message?: string;
          headers?: string[];
          rows?: (string | number | boolean)[][];
          spreadsheetId?: string;
          sheetTitle?: string;
        } | null;
        if (!res.ok) {
          throw new Error(data?.message ?? "Не удалось прочитать таблицу");
        }
        const headers = data?.headers ?? [];
        const rows = data?.rows ?? [];
        if (headers.length === 0) {
          throw new Error("В таблице нет строки заголовков");
        }
        const nextMapping: Record<string, number> = {};
        headers.forEach((h, idx) => {
          const base = importFields.find((f) => f.label === h);
          if (base) nextMapping[base.key] = idx;
          const custom = importCustomDefs.find((d) => d.label === h);
          if (custom) nextMapping[`custom:${custom.label}`] = idx;
        });
        setImportHeaders(headers);
        setImportRows(rows);
        setImportMapping(nextMapping);
        setImportFileName(
          typeof data?.sheetTitle === "string" ? `Google Sheets — ${data.sheetTitle}` : "Google Sheets"
        );
        if (typeof data?.spreadsheetId === "string" && data.spreadsheetId) {
          await fetch("/api/psychologist/google-sheets", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              spreadsheetId: `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`
            })
          }).catch(() => {});
        }
        toast.success("Таблица загружена — проверьте сопоставление колонок и нажмите «Импортировать»");
      } catch (err) {
        console.error(err);
        const msg = err instanceof Error ? err.message : "Ошибка загрузки из Google";
        toast.error(msg);
        setGlobalError?.(msg);
      } finally {
        setGoogleSheetsImportLoading(false);
      }
    },
    [importCustomDefs, importFields, setGlobalError]
  );

  const handleImportFromGoogleSheets = useCallback(async () => {
    await loadGoogleSheetsTableIntoImport(googleSheetsImportUrl);
  }, [googleSheetsImportUrl, loadGoogleSheetsTableIntoImport]);

  const handleOpenGoogleSheetsPicker = useCallback(async () => {
    setImportOpen(false);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 50);
        });
      });
    });

    setGoogleSheetsPickerLoading(true);
    try {
      const res = await fetch("/api/psychologist/google-sheets/access-token");
      const data = (await res.json().catch(() => null)) as { accessToken?: string; message?: string } | null;
      if (!res.ok) {
        throw new Error(data?.message ?? "Не удалось получить доступ к Google");
      }
      const accessToken = data?.accessToken;
      if (!accessToken) {
        throw new Error("Нет токена доступа — подключите Google ещё раз");
      }
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY?.trim();

      function reopenImportDialog() {
        resumeImportWithoutResetRef.current = true;
        setImportOpen(true);
      }

      openGoogleSheetsPicker({
        accessToken,
        developerKey: apiKey,
        onPicked: (id) => {
          const url = `https://docs.google.com/spreadsheets/d/${id}/edit`;
          skipGoogleSheetsProfileUrlOnceRef.current = true;
          setGoogleSheetsImportUrl(url);
          resumeImportWithoutResetRef.current = true;
          setImportOpen(true);
          window.setTimeout(() => {
            void loadGoogleSheetsTableIntoImport(url);
          }, 0);
        },
        onCancel: () => {
          reopenImportDialog();
        },
        onError: (msg) => {
          toast.error(msg);
          reopenImportDialog();
        }
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
      resumeImportWithoutResetRef.current = true;
      setImportOpen(true);
    } finally {
      setGoogleSheetsPickerLoading(false);
    }
  }, [loadGoogleSheetsTableIntoImport, setImportOpen]);

  const handleDisconnectGoogleSheets = useCallback(async () => {
    try {
      const res = await fetch("/api/psychologist/google-sheets", { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(data?.message ?? "Не удалось отключить Google");
      setGoogleSheetsGoogleConnected(false);
      toast.success("Доступ Google к таблицам отключён");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отключить");
    }
  }, []);

  const handleImportSubmit = useCallback(async () => {
    if (importRows.length === 0) return;
    setImporting(true);
    setGlobalError?.(null);
    try {
      const clients = importRows.map((row) => {
        const get = (key: string) => {
          const idx = importMapping[key];
          if (idx == null || idx < 0 || idx >= row.length) return null;
          const v = row[idx];
          return v == null ? null : String(v).trim() || null;
        };
        const customFields: Record<string, unknown> = {};
        for (const d of importCustomDefs) {
          const v = get(`custom:${d.label}`);
          if (v !== null && v !== undefined) customFields[d.label] = v;
        }
        return {
          firstName: get("firstName") ?? "",
          lastName: get("lastName") ?? "",
          email: get("email"),
          phone: get("phone"),
          dateOfBirth: get("dateOfBirth"),
          country: get("country"),
          city: get("city"),
          gender: get("gender"),
          maritalStatus: get("maritalStatus"),
          status: get("status"),
          notes: get("notes"),
          customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
        };
      });
      const res = await fetch("/api/psychologist/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clients,
          options: { skipDuplicatesByEmail: importSkipDuplicates }
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 400 && (data as { issues?: unknown[] }).issues) {
          console.error("Ошибка валидации при импорте. Детали (issues):", (data as { issues: unknown[] }).issues);
        }
        throw new Error((data as { message?: string }).message ?? "Ошибка импорта");
      }
      setImportResult(data as ClientsImportResult);
      if ((data as ClientsImportResult).created > 0 || (data as ClientsImportResult).skipped > 0) {
        await onImported?.();
      }
    } catch (err) {
      console.error(err);
      setGlobalError?.(err instanceof Error ? err.message : "Ошибка импорта");
    } finally {
      setImporting(false);
    }
  }, [importCustomDefs, importMapping, importRows, importSkipDuplicates, onImported, setGlobalError]);

  return {
    importHeaders,
    importRows,
    importMapping,
    setImportMapping,
    importSkipDuplicates,
    setImportSkipDuplicates,
    importing,
    importResult,
    importFileName,
    importFileInputRef: importFileInputRef as RefObject<HTMLInputElement>,
    googleSheetsImportUrl,
    setGoogleSheetsImportUrl,
    googleSheetsImportLoading,
    googleSheetsPickerLoading,
    googleSheetsOAuthConfigured,
    googleSheetsGoogleConnected,
    handleImportFile,
    resetImportSourceSelection,
    handleImportSubmit,
    handleImportFromGoogleSheets,
    handleOpenGoogleSheetsPicker,
    handleDisconnectGoogleSheets
  };
}

export type UseClientsImportReturn = ReturnType<typeof useClientsImport>;

