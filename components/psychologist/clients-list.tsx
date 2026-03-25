"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar as CalendarIcon,
  ArrowUpDown,
  UserCheck,
  Users,
  Plus,
  Trash2,
  Pencil,
  Download,
  ChevronDown,
  Upload,
  FileSpreadsheet,
  UploadCloud,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { ru } from "date-fns/locale";
import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from "@/components/ui/popover";
import { DataTable } from "@/components/ui/data-table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { PhoneInput, formatPhoneDisplay, phoneToTelHref } from "@/components/ui/phone-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { PsychologistClientProfile } from "@/components/psychologist/client-profile";
import { cn } from "@/lib/utils";
import { shouldCloseCalendarPopoverAfterSelect } from "@/lib/close-calendar-popover";
import { openGoogleSheetsPicker } from "@/lib/google-sheet-picker-client";

type ClientDto = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  notes?: string | null;
  createdAt: string;
  hasAccount?: boolean;
  avatarUrl?: string | null;
  statusId?: string | null;
  statusLabel?: string | null;
  statusColor?: string | null;
  customFields?: Record<string, unknown>;
};

const AVATAR_COLORS = [
  "bg-rose-200 text-rose-800",
  "bg-violet-200 text-violet-800",
  "bg-sky-200 text-sky-800",
  "bg-emerald-200 text-emerald-800",
  "bg-amber-200 text-amber-800",
  "bg-pink-200 text-pink-800",
  "bg-teal-200 text-teal-800",
  "bg-indigo-200 text-indigo-800",
];

function getClientColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const IMPORT_FIELDS: { key: string; label: string }[] = [
  { key: "firstName", label: "Имя" },
  { key: "lastName", label: "Фамилия" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Телефон" },
  { key: "dateOfBirth", label: "Дата рождения" },
  { key: "country", label: "Страна" },
  { key: "city", label: "Город" },
  { key: "gender", label: "Пол" },
  { key: "maritalStatus", label: "Семейное положение" },
  { key: "status", label: "Статус" },
  { key: "notes", label: "Заметки" }
];

function formatCustomFieldValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    try {
      return new Date(value).toLocaleDateString("ru-RU");
    } catch {
      return value;
    }
  }
  if (value instanceof Date) return value.toLocaleDateString("ru-RU");
  return String(value);
}

/** Кнопка сортировки в шапке: без min-width, иначе ghost-hover тянется на ширину колонки (как у Email). */
const CLIENTS_TABLE_SORT_HEADER_BTN_CLASS =
  "inline-flex h-8 w-max max-w-full shrink-0 items-center justify-start gap-1.5 rounded-md px-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground";

function ClientAvatar({ client, size = "md" }: { client: ClientDto; size?: "sm" | "md" }) {
  const initials = `${client.firstName[0] ?? ""}${client.lastName[0] ?? ""}`.toUpperCase();
  const color = getClientColor(client.id);
  return (
    <Avatar
      className={cn(
        "shrink-0 border border-border",
        size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm"
      )}
    >
      <AvatarImage
        src={client.avatarUrl ?? undefined}
        alt={`${client.firstName} ${client.lastName}`}
        className="object-cover"
      />
      <AvatarFallback
        className={cn(
          "flex items-center justify-center font-semibold",
          color
        )}
      >
        {initials || "?"}
      </AvatarFallback>
    </Avatar>
  );
}

export function PsychologistClientsList({
  schedulingEnabled,
  diagnosticsEnabled
}: {
  schedulingEnabled: boolean;
  diagnosticsEnabled: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [clients, setClients] = useState<ClientDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [profileClient, setProfileClient] = useState<ClientDto | null>(null);

  // Синхронизация профиля с URL: при переходе по ссылке «Клиенты» в навбаре (без ?profile=) закрываем профиль
  const profileIdFromUrl = searchParams.get("profile");
  useEffect(() => {
    if (!profileIdFromUrl) {
      setProfileClient(null);
      return;
    }
    const client = clients.find(c => c.id === profileIdFromUrl);
    if (client) setProfileClient(client);
  }, [profileIdFromUrl, clients]);

  useEffect(() => {
    const v = searchParams.get("sheet_oauth");
    const openImport = searchParams.get("openImport") === "1";
    const sheetIntent = searchParams.get("sheet_intent");
    if (!v && !openImport) return;

    if (openImport) setImportOpen(true);

    if (v === "ok" && sheetIntent === "export") {
      toast.success("Google подключён. Снова нажмите «Экспорт» → «В Google Таблицу».");
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

    const q = new URLSearchParams(searchParams.toString());
    q.delete("sheet_oauth");
    q.delete("openImport");
    q.delete("sheet_intent");
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [dob, setDob] = useState<Date | undefined>(undefined);
  const [addDobPopoverOpen, setAddDobPopoverOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    notes: ""
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [statuses, setStatuses] = useState<Array<{ id: string; label: string; color: string }>>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [tableCustomFieldDefs, setTableCustomFieldDefs] = useState<Array<{ id: string; label: string }>>([]);
  /** undefined — загрузка с сервера; null — в БД нет сохранённого порядка */
  const [clientsTableColumnOrder, setClientsTableColumnOrder] = useState<string[] | null | undefined>(
    undefined
  );

  const MIN_LIST_WIDTH = 1;
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const listInnerRef = useRef<HTMLDivElement | null>(null);
  const loadClientsAbortRef = useRef<AbortController | null>(null);
  const [listScale, setListScale] = useState(1);
  const [listInnerHeight, setListInnerHeight] = useState(0);
  const [singleDeleteDialogOpen, setSingleDeleteDialogOpen] = useState(false);
  const [singleDeleting, setSingleDeleting] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [googleSheetsImportUrl, setGoogleSheetsImportUrl] = useState("");
  const [googleSheetsImportLoading, setGoogleSheetsImportLoading] = useState(false);
  const [googleSheetsPickerLoading, setGoogleSheetsPickerLoading] = useState(false);
  const [googleSheetsOAuthConfigured, setGoogleSheetsOAuthConfigured] = useState<boolean | null>(
    null
  );
  const [googleSheetsGoogleConnected, setGoogleSheetsGoogleConnected] = useState<boolean | null>(
    null
  );

  const [importOpen, setImportOpen] = useState(false);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<(string | number | boolean)[][]>([]);
  const [importMapping, setImportMapping] = useState<Record<string, number>>({});
  const [importCustomDefs, setImportCustomDefs] = useState<Array<{ id: string; label: string }>>([]);
  const [importSkipDuplicates, setImportSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number;
    updated?: number;
    skipped: number;
    failed: number;
    errors: { row: number; message: string }[];
    warnings?: { row: number; message: string }[];
  } | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  /** После Google Picker не сбрасывать шаг импорта (иначе стирается выбранная ссылка). */
  const resumeImportWithoutResetRef = useRef(false);
  /** Не подставлять URL из профиля поверх только что выбранной в Picker таблицы. */
  const skipGoogleSheetsProfileUrlOnceRef = useRef(false);

  const syncGoogleSheetsFromServer = useCallback(async (fillImportUrl: boolean) => {
    try {
      const res = await fetch("/api/psychologist/google-sheets");
      if (!res.ok) return;
      const data = (await res.json().catch(() => null)) as {
        oauthConfigured?: boolean;
        googleConnected?: boolean;
        spreadsheetId?: string | null;
      } | null;
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
  }, []);

  useEffect(() => {
    void syncGoogleSheetsFromServer(false);
  }, [syncGoogleSheetsFromServer]);

  useEffect(() => {
    const el = listContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      // Игнорируем нулевую ширину — переходное состояние при монтировании/навигации.
      if (w <= 0) return;
      setListScale(w >= MIN_LIST_WIDTH ? 1 : Math.max(0.3, w / MIN_LIST_WIDTH));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (listScale >= 1) return;
    const el = listInnerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setListInnerHeight(el.offsetHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [listScale, loading, clients.length, statusFilter]);

  const loadClients = useCallback(async () => {
    loadClientsAbortRef.current?.abort();
    const ctrl = new AbortController();
    loadClientsAbortRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/psychologist/clients", { signal: ctrl.signal });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "Не удалось загрузить клиентов");
      }
      const data = (await res.json()) as { clients: ClientDto[] };
      setClients(data.clients);
      setSelectedIds(new Set());
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error(err);
      setError(err instanceof Error ? err.message : "Не удалось загрузить клиентов");
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, []);

  const persistClientsTableColumnOrder = useCallback(async (order: string[]) => {
    try {
      const res = await fetch("/api/psychologist/clients-table-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnOrder: order })
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        toast.error(
          typeof err?.message === "string" ? err.message : "Не удалось сохранить порядок колонок"
        );
        return;
      }
    } catch {
      toast.error("Не удалось сохранить порядок колонок");
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/psychologist/clients-table-settings");
        if (!res.ok) throw new Error("bad");
        const data = (await res.json()) as { columnOrder: string[] | null };
        if (!cancelled) setClientsTableColumnOrder(data.columnOrder ?? null);
      } catch {
        if (!cancelled) setClientsTableColumnOrder(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    async function loadStatuses() {
      try {
        const res = await fetch("/api/psychologist/client-statuses");
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        setStatuses(data?.items ?? []);
      } catch (err) {
        console.error(err);
      }
    }
    void loadStatuses();
  }, []);

  useEffect(() => {
    async function loadCustomFieldDefs() {
      try {
        const res = await fetch("/api/psychologist/custom-fields");
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        const items = data?.items ?? [];
        setTableCustomFieldDefs(items.map((d: { id: string; label: string }) => ({ id: d.id, label: d.label })));
      } catch (err) {
        console.error(err);
      }
    }
    void loadCustomFieldDefs();
  }, []);

  useEffect(() => {
    setProfileEditing(false);
  }, [profileClient?.id]);

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
  }, [importOpen, syncGoogleSheetsFromServer]);

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

  /** Определяет разделитель по первой строке (учитывает кавычки). Часто в RU/Excel — `;`. */
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

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
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
          new Set(arr.flatMap((o) => Object.keys((o as { customFields?: Record<string, unknown> }).customFields ?? {})))
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
          const base = IMPORT_FIELDS.find((f) => f.label === h);
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
        const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
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
          const base = IMPORT_FIELDS.find((f) => f.label === h);
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
          const base = IMPORT_FIELDS.find((f) => f.label === h);
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
      setError("Не удалось прочитать файл");
    }
  }

  function downloadTemplate() {
    try {
      const headers = IMPORT_FIELDS.map((f) => f.label);
      const csv = `${headers.join(",")}\n`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "clients-template.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download template", err);
    }
  }

  async function handleImportSubmit() {
    if (importRows.length === 0) return;
    setImporting(true);
    setError(null);
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
          customFields: Object.keys(customFields).length > 0 ? customFields : undefined
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
        if (res.status === 400 && data?.issues) {
          console.error("Ошибка валидации при импорте. Детали (issues):", data.issues);
          data.issues.forEach((issue: { path?: unknown[]; message?: string }, i: number) => {
            const path = issue.path?.length ? issue.path.join(".") : "данные";
            console.error(`  [${i + 1}] Поле: ${path} — ${issue.message ?? ""}`);
          });
        }
        throw new Error(data?.message ?? "Ошибка импорта");
      }
      setImportResult(data as { created: number; skipped: number; failed: number; errors: { row: number; message: string }[] });
      if (data.created > 0 || data.skipped > 0) {
        void loadClients();
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Ошибка импорта");
    } finally {
      setImporting(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFormError(null);
    try {
      const body = {
        ...form,
        email: form.email.trim() || undefined,
        dateOfBirth: dob ? dob.toISOString() : undefined
      };
      const res = await fetch("/api/psychologist/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Не удалось создать клиента");

      await loadClients();
      setForm({ email: "", firstName: "", lastName: "", phone: "", notes: "" });
      setDob(undefined);
      setAddOpen(false);
    } catch (err) {
      console.error(err);
      setFormError(err instanceof Error ? err.message : "Не удалось создать клиента");
    } finally {
      setCreating(false);
    }
  }

  function toggleOne(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const toggleAll = useCallback((checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(clients.map(c => c.id)));
  }, [clients]);

  function openBulkDeleteDialog() {
    if (selectedIds.size === 0) return;
    setBulkDeleteDialogOpen(true);
  }

  async function confirmBulkDelete() {
    setBulkDeleteDialogOpen(false);
    setBulkDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/psychologist/clients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message ?? "Не удалось удалить выбранных клиентов");
      }
      setSelectedIds(new Set());
      setMultiSelectMode(false);
      await loadClients();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось удалить выбранных клиентов"
      );
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleExportGoogleSheets() {
    if (clients.length === 0) return;

    type GsJson = {
      oauthConfigured?: boolean;
      googleConnected?: boolean;
      spreadsheetId?: string | null;
    };

    let oauthOk = googleSheetsOAuthConfigured;
    let connected = googleSheetsGoogleConnected;

    if (oauthOk === null || connected === null) {
      let data: GsJson | null = null;
      try {
        const res = await fetch("/api/psychologist/google-sheets");
        if (res.ok) data = (await res.json().catch(() => null)) as GsJson | null;
      } catch {
        toast.error("Не удалось проверить настройки Google. Обновите страницу и попробуйте снова.");
        return;
      }
      if (!data) {
        toast.error("Не удалось проверить настройки Google. Обновите страницу и попробуйте снова.");
        return;
      }
      oauthOk = Boolean(data.oauthConfigured);
      connected = Boolean(data.googleConnected);
      setGoogleSheetsOAuthConfigured(oauthOk);
      setGoogleSheetsGoogleConnected(connected);
      const sid =
        typeof data.spreadsheetId === "string" && data.spreadsheetId.trim()
          ? data.spreadsheetId.trim()
          : null;
      if (connected && sid) {
        setGoogleSheetsImportUrl(`https://docs.google.com/spreadsheets/d/${sid}/edit`);
      }
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
          setGoogleSheetsGoogleConnected(false);
          void syncGoogleSheetsFromServer(false);
        }
        throw new Error(data?.message ?? "Не удалось выгрузить в Google Таблицу");
      }
      void syncGoogleSheetsFromServer(false);
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
  }

  async function handleExport(format: "csv" | "json" | "xlsx") {
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
      setError(err instanceof Error ? err.message : "Ошибка экспорта");
    } finally {
      setExporting(false);
    }
  }

  const loadGoogleSheetsTableIntoImport = useCallback(
    async (spreadsheetUrlOrId: string) => {
      const trimmed = spreadsheetUrlOrId.trim();
      if (!trimmed) {
        toast.error("Укажите ссылку на таблицу");
        return;
      }
      setGoogleSheetsImportLoading(true);
      setError(null);
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
          const base = IMPORT_FIELDS.find((f) => f.label === h);
          if (base) nextMapping[base.key] = idx;
          const custom = importCustomDefs.find((d) => d.label === h);
          if (custom) nextMapping[`custom:${custom.label}`] = idx;
        });
        setImportHeaders(headers);
        setImportRows(rows);
        setImportMapping(nextMapping);
        setImportFileName(
          typeof data?.sheetTitle === "string"
            ? `Google Sheets — ${data.sheetTitle}`
            : "Google Sheets"
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
        setError(msg);
      } finally {
        setGoogleSheetsImportLoading(false);
      }
    },
    [importCustomDefs]
  );

  const resetImportSourceSelection = useCallback(() => {
    setImportHeaders([]);
    setImportRows([]);
    setImportMapping({});
    setImportFileName(null);
    setImportResult(null);
    if (importFileInputRef.current) importFileInputRef.current.value = "";
  }, []);

  async function handleImportFromGoogleSheets() {
    await loadGoogleSheetsTableIntoImport(googleSheetsImportUrl);
  }

  async function handleOpenGoogleSheetsPicker() {
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
      const data = (await res.json().catch(() => null)) as {
        accessToken?: string;
        message?: string;
      } | null;
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
  }

  async function handleDisconnectGoogleSheets() {
    try {
      const res = await fetch("/api/psychologist/google-sheets", { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(data?.message ?? "Не удалось отключить Google");
      setGoogleSheetsGoogleConnected(false);
      toast.success("Доступ Google к таблицам отключён");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отключить");
    }
  }

  async function confirmSingleDelete() {
    if (!profileClient) return;
    setSingleDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/psychologist/clients/${profileClient.id}`, {
        method: "DELETE"
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message ?? "Не удалось удалить клиента");
      }
      setProfileClient(null);
      router.replace(pathname);
      await loadClients();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Не удалось удалить клиента"
      );
    } finally {
      setSingleDeleting(false);
      setSingleDeleteDialogOpen(false);
    }
  }

  // Переиспользуем старую таблицу (DataTable) с управлением, но профиль открываем полноэкранно
  const columns: ColumnDef<ClientDto>[] = useMemo(
    () => [
      {
        id: "select",
        header: () => {
          if (!multiSelectMode) return null;

          const allSelected =
            clients.length > 0 && selectedIds.size === clients.length;
          const someSelected =
            selectedIds.size > 0 && selectedIds.size < clients.length;

          return (
            <Checkbox
              aria-label="Выбрать всех клиентов"
              checked={someSelected ? "indeterminate" : allSelected}
              onCheckedChange={checked => toggleAll(checked === true)}
            />
          );
        },
        cell: ({ row }) =>
          multiSelectMode ? (
            <div onClick={e => e.stopPropagation()} className="flex items-center">
              <Checkbox
                aria-label="Выбрать клиента"
                checked={selectedIds.has(row.original.id)}
                onCheckedChange={() => toggleOne(row.original.id)}
              />
            </div>
          ) : null,
        enableSorting: false,
        enableHiding: false
      },
      // скрытая колонка для полнотекстового поиска
      {
        id: "search",
        accessorFn: row =>
          `${row.lastName ?? ""} ${row.firstName ?? ""} ${row.email ?? ""} ${row.phone ?? ""}`,
        header: () => null,
        cell: () => null,
        enableHiding: false,
        enableSorting: false
      },
      {
        id: "status",
        accessorFn: row => row.statusLabel ?? "",
        enableHiding: false,
        header: () => (
          <span className="inline-block min-w-[8rem] text-xs font-medium text-muted-foreground whitespace-nowrap">
            Статус
          </span>
        ),
        cell: ({ row }) => {
          const { statusLabel, statusColor } = row.original;
          if (!statusLabel) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          const displayLabel =
            statusLabel.length > 16 ? `${statusLabel.slice(0, 16)}…` : statusLabel;
          return (
            <span
              className="inline-flex min-w-[8rem] items-center justify-center rounded-md px-2 py-0.5 text-[11px] font-medium text-white whitespace-nowrap"
              style={{ backgroundColor: statusColor ?? "hsl(217 91% 60%)" }}
              title={statusLabel.length > 16 ? statusLabel : undefined}
            >
              {displayLabel}
            </span>
          );
        }
      },
      {
        id: "name",
        accessorFn: row => `${row.lastName} ${row.firstName}`,
        header: ({ column }) => (
          <div className="flex min-w-[14rem] items-center gap-2">
            {/* как в ячейке: аватар h-8 w-8 + gap-2 */}
            <span className="h-8 w-8 shrink-0" aria-hidden />
            <Button
              variant="ghost"
              size="sm"
              className={CLIENTS_TABLE_SORT_HEADER_BTN_CLASS}
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Имя
              <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex min-w-[14rem] items-center gap-2 whitespace-nowrap">
              <ClientAvatar client={c} size="sm" />
              <span className="font-medium inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className="whitespace-nowrap">
                  {c.lastName} {c.firstName}
                </span>
                {c.hasAccount === true && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex text-muted-foreground hover:text-foreground cursor-help focus:outline-none">
                        <UserCheck className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="sr-only">Зарегистрирован</span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Клиент зарегистрирован
                    </TooltipContent>
                  </Tooltip>
                )}
              </span>
            </div>
          );
        }
      },
      {
        id: "dateOfBirth",
        accessorFn: row => row.dateOfBirth ?? "",
        header: () => (
          <span className="inline-block min-w-[8rem] text-xs font-medium text-muted-foreground whitespace-nowrap">
            Дата рождения
          </span>
        ),
        cell: ({ row }) => {
          const v = row.original.dateOfBirth;
          if (!v) return <span className="text-muted-foreground">—</span>;
          try {
            const d = typeof v === "string" ? new Date(v) : v;
            return (
              <span className="inline-block min-w-[8rem] text-muted-foreground whitespace-nowrap">{d.toLocaleDateString("ru-RU")}</span>
            );
          } catch {
            return <span className="text-muted-foreground">—</span>;
          }
        }
      },
      {
        accessorKey: "country",
        header: () => (
          <span className="inline-block min-w-[8rem] text-xs font-medium text-muted-foreground whitespace-nowrap">Страна</span>
        ),
        cell: ({ row }) => (
          <span className="inline-block max-w-[10rem] overflow-hidden text-ellipsis text-muted-foreground whitespace-nowrap" title={row.original.country ?? ""}>{row.original.country ?? "—"}</span>
        )
      },
      {
        accessorKey: "city",
        header: () => (
          <span className="inline-block min-w-[8rem] text-xs font-medium text-muted-foreground whitespace-nowrap">Город</span>
        ),
        cell: ({ row }) => (
          <span className="inline-block max-w-[10rem] overflow-hidden text-ellipsis text-muted-foreground whitespace-nowrap" title={row.original.city ?? ""}>{row.original.city ?? "—"}</span>
        )
      },
      {
        accessorKey: "gender",
        header: () => (
          <span className="inline-block min-w-[6rem] text-xs font-medium text-muted-foreground whitespace-nowrap">Пол</span>
        ),
        cell: ({ row }) => (
          <span className="inline-block min-w-[6rem] text-muted-foreground whitespace-nowrap">{row.original.gender ?? "—"}</span>
        )
      },
      {
        accessorKey: "maritalStatus",
        header: () => (
          <span className="inline-block min-w-[11rem] text-xs font-medium text-muted-foreground whitespace-nowrap">Семейное положение</span>
        ),
        cell: ({ row }) => (
          <span className="inline-block max-w-[12rem] overflow-hidden text-ellipsis text-muted-foreground whitespace-nowrap" title={row.original.maritalStatus ?? ""}>{row.original.maritalStatus ?? "—"}</span>
        )
      },
      {
        accessorKey: "notes",
        header: () => (
          <span className="inline-block min-w-[12rem] text-xs font-medium text-muted-foreground whitespace-nowrap">Заметки</span>
        ),
        cell: ({ row }) => {
          const n = row.original.notes;
          if (!n || !n.trim()) return <span className="text-muted-foreground">—</span>;
          const short = n.length > 40 ? `${n.slice(0, 40)}…` : n;
          return (
            <span className="inline-block max-w-[18rem] overflow-hidden text-ellipsis text-muted-foreground whitespace-nowrap" title={n}>
              {short}
            </span>
          );
        }
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className={cn(CLIENTS_TABLE_SORT_HEADER_BTN_CLASS, "whitespace-nowrap")}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Email
            <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="inline-block min-w-[14rem] text-muted-foreground whitespace-nowrap">{row.original.email ?? "—"}</span>
        )
      },
      {
        accessorKey: "phone",
        header: () => (
          <span className="inline-block min-w-[10rem] text-xs font-medium text-muted-foreground whitespace-nowrap">Телефон</span>
        ),
        cell: ({ row }) => {
          const p = row.original.phone;
          const href = phoneToTelHref(p);
          const label = formatPhoneDisplay(p);
          if (!href || label === "—") {
            return (
              <span className="inline-block min-w-[10rem] text-muted-foreground whitespace-nowrap">
                {label}
              </span>
            );
          }
          return (
            <a
              href={href}
              className="inline-block min-w-[10rem] text-primary underline-offset-2 hover:underline whitespace-nowrap"
              onClick={e => e.stopPropagation()}
            >
              {label}
            </a>
          );
        }
      },
      {
        id: "createdAt",
        accessorFn: row => row.createdAt,
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className={cn(CLIENTS_TABLE_SORT_HEADER_BTN_CLASS, "whitespace-nowrap")}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Создан
            <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="inline-block min-w-[8rem] text-muted-foreground whitespace-nowrap">
            {new Date(row.original.createdAt).toLocaleDateString("ru-RU")}
          </span>
        )
      },
      ...tableCustomFieldDefs.map(def => ({
        id: `custom:${def.label}`,
        accessorFn: (row: ClientDto) => (row.customFields ?? {})[def.label],
        header: () => (
          <span className="text-xs font-medium text-muted-foreground">{def.label}</span>
        ),
        cell: ({ row }: { row: { original: ClientDto } }) => (
          <span className="inline-block max-w-[12rem] overflow-hidden text-ellipsis text-muted-foreground whitespace-nowrap" title={String((row.original.customFields ?? {})[def.label] ?? "")}>
            {formatCustomFieldValue((row.original.customFields ?? {})[def.label])}
          </span>
        )
      }))
    ],
    [clients, selectedIds, multiSelectMode, tableCustomFieldDefs, toggleAll]
  );

  // Профиль клиента поверх списка (на всю основную ширину)
  if (profileClient) {
    return (
      <div className="px-6 py-4">
        <div className="w-full space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 px-2"
              onClick={() => { setProfileClient(null); router.replace(pathname); }}
            >
              <span className="text-lg leading-none">←</span>
              <span className="text-sm">Вернуться назад</span>
            </Button>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={profileEditing ? "secondary" : "outline"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setProfileEditing(prev => !prev)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">
                        {profileEditing ? "Завершить редактирование" : "Редактировать профиль"}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {profileEditing ? "Завершить редактирование" : "Редактировать профиль"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <AlertDialog open={singleDeleteDialogOpen} onOpenChange={setSingleDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:border-destructive hover:bg-destructive/10"
                    disabled={singleDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Удалить клиента</span>
                  </Button>
                </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить клиента из списка?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Удалить этого клиента из вашего списка? Его записи и тесты в системе сохранятся.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmSingleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {singleDeleting ? "Удаляем..." : "Удалить"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          <PsychologistClientProfile
            id={profileClient.id}
            schedulingEnabled={schedulingEnabled}
            diagnosticsEnabled={diagnosticsEnabled}
            email={profileClient.email ?? null}
            hasAccount={profileClient.hasAccount}
            firstName={profileClient.firstName}
            lastName={profileClient.lastName}
            dateOfBirth={profileClient.dateOfBirth ?? null}
            phone={profileClient.phone ?? null}
            country={profileClient.country ?? null}
            city={profileClient.city ?? null}
            gender={profileClient.gender ?? null}
            maritalStatus={profileClient.maritalStatus ?? null}
            notes={profileClient.notes ?? null}
            createdAt={profileClient.createdAt}
            statusId={profileClient.statusId ?? null}
            statusLabel={profileClient.statusLabel ?? null}
            statusColor={profileClient.statusColor ?? null}
            avatarUrl={profileClient.avatarUrl ?? null}
            isEditing={profileEditing}
            onEditingChange={setProfileEditing}
            onDeleted={async () => {
              setProfileEditing(false);
              setProfileClient(null);
              router.replace(pathname);
              await loadClients();
            }}
            onUpdated={next => {
              setClients(prev =>
                prev.map(c =>
                  c.id === profileClient.id
                    ? {
                        ...c,
                        firstName: next.firstName,
                        lastName: next.lastName,
                        email: next.email ?? null,
                        phone: next.phone ?? null,
                        country: next.country ?? null,
                        city: next.city ?? null,
                        gender: next.gender ?? null,
                        maritalStatus: next.maritalStatus ?? null,
                        notes: next.notes ?? null,
                        dateOfBirth: next.dateOfBirth ?? null,
                        statusId: next.statusId ?? null,
                        statusLabel: next.statusLabel ?? null,
                        statusColor: next.statusColor ?? null
                      }
                    : c
                )
              );
              setProfileClient(prev =>
                prev
                  ? {
                      ...prev,
                      firstName: next.firstName,
                      lastName: next.lastName,
                      email: next.email ?? null,
                      phone: next.phone ?? null,
                      country: next.country ?? null,
                      city: next.city ?? null,
                      gender: next.gender ?? null,
                      maritalStatus: next.maritalStatus ?? null,
                      notes: next.notes ?? null,
                      dateOfBirth: next.dateOfBirth ?? null,
                      statusId: next.statusId ?? null,
                      statusLabel: next.statusLabel ?? null,
                      statusColor: next.statusColor ?? null
                    }
                  : prev
              );
            }}
          />
        </div>
      </div>
    );
  }

  const listScaled = listScale < 1;
  const visibleClients =
    statusFilter === "ALL"
      ? clients
      : clients.filter((c) => c.statusId === statusFilter);

  return (
    <TooltipProvider>
    <div className="px-3 py-4 sm:px-6">
      <div ref={listContainerRef} className="w-full min-w-0 space-y-4">
        <div
          style={{
            overflow: listScaled ? "hidden" : undefined,
            width: listScaled ? MIN_LIST_WIDTH * listScale : undefined,
            height: listScaled && listInnerHeight > 0 ? listInnerHeight * listScale : undefined,
            maxWidth: "100%",
            margin: listScaled ? "0 auto" : undefined
          }}
        >
          <div
            ref={listInnerRef}
            className="space-y-4"
            style={{
              width: listScaled ? MIN_LIST_WIDTH : undefined,
              transform: listScaled ? `scale(${listScale})` : undefined,
              transformOrigin: "0 0"
            }}
          >
            {/* Фильтр по статусу */}
            {statuses.length > 0 && (
              <Tabs
                value={statusFilter}
                onValueChange={setStatusFilter}
                className="w-full"
              >
                <TabsList className="inline-flex h-9 max-w-full overflow-x-auto rounded-full bg-muted px-1 py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <TabsTrigger
                    value="ALL"
                    className="rounded-full px-3 data-[state=active]:bg-background data-[state=active]:text-foreground"
                  >
                    Все
                  </TabsTrigger>
                  {statuses.map((st) => (
                    <TabsTrigger
                      key={st.id}
                      value={st.id}
                      className="rounded-full px-3 data-[state=active]:bg-background data-[state=active]:text-foreground"
                    >
                      {st.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
            {/* Header: на узких экранах — колонка, чтобы подсказка не сжималась в одну линию с кнопками */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
              <div className="min-w-0 w-full flex flex-col gap-1 sm:max-w-xl sm:pr-2">
                <p className="text-pretty text-sm leading-snug text-muted-foreground">
                  Нажмите на строку, чтобы открыть профиль клиента.
                </p>
                {multiSelectMode && selectedIds.size > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Выбрано клиентов: {selectedIds.size}
                  </p>
                )}
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
                {/* Десктоп: кнопки в ряд */}
                <div className="hidden flex-wrap items-center gap-2 md:flex md:justify-end">
                  {multiSelectMode ? (
                    <>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={selectedIds.size === 0 || bulkDeleting}
                        onClick={openBulkDeleteDialog}
                      >
                        {bulkDeleting
                          ? "Удаляем..."
                          : `Удалить выбранных${selectedIds.size ? ` (${selectedIds.size})` : ""}`}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedIds(new Set());
                          setMultiSelectMode(false);
                        }}
                      >
                        Отменить выделение
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedIds(new Set());
                        setMultiSelectMode(true);
                      }}
                    >
                      Выбрать несколько
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={exporting || clients.length === 0}
                      >
                        <Download className="h-4 w-4 mr-1.5" />
                        {exporting ? "Экспорт…" : "Экспорт"}
                        <ChevronDown className="h-4 w-4 ml-1.5 opacity-70" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleExport("csv")}
                        disabled={exporting}
                      >
                        Скачать CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExport("json")}
                        disabled={exporting}
                      >
                        Скачать JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExport("xlsx")}
                        disabled={exporting}
                      >
                        Скачать XLSX
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => void handleExportGoogleSheets()}
                        disabled={
                          exporting ||
                          clients.length === 0 ||
                          googleSheetsOAuthConfigured === false
                        }
                      >
                        <FileSpreadsheet className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                        В Google Таблицу
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                    <Upload className="h-4 w-4 mr-1.5" />
                    Импорт
                  </Button>
                  <Button size="sm" onClick={() => setAddOpen(true)}>
                    Добавить клиента
                  </Button>
                </div>

                {/* Узкий экран: одно меню «Действия» (без вложенного Sub — на тач-устройствах он часто не открывается) */}
                <div className="flex w-full justify-end md:hidden">
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-1.5"
                        aria-haspopup="menu"
                      >
                        Действия
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      sideOffset={6}
                      className="w-[min(100vw-2rem,20rem)]"
                    >
                      {multiSelectMode ? (
                        <>
                          <DropdownMenuItem
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            disabled={selectedIds.size === 0 || bulkDeleting}
                            onClick={openBulkDeleteDialog}
                          >
                            {bulkDeleting
                              ? "Удаляем..."
                              : `Удалить выбранных${selectedIds.size ? ` (${selectedIds.size})` : ""}`}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedIds(new Set());
                              setMultiSelectMode(false);
                            }}
                          >
                            Отменить выделение
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      ) : (
                        <>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedIds(new Set());
                              setMultiSelectMode(true);
                            }}
                          >
                            Выбрать несколько
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuLabel className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                        <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {exporting ? "Экспорт…" : "Экспорт"}
                      </DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => handleExport("csv")}
                        disabled={exporting || clients.length === 0}
                      >
                        Скачать CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExport("json")}
                        disabled={exporting || clients.length === 0}
                      >
                        Скачать JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExport("xlsx")}
                        disabled={exporting || clients.length === 0}
                      >
                        Скачать XLSX
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => void handleExportGoogleSheets()}
                        disabled={
                          exporting ||
                          clients.length === 0 ||
                          googleSheetsOAuthConfigured === false
                        }
                      >
                        <FileSpreadsheet className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                        В Google Таблицу
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setImportOpen(true)}>
                        <Upload className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                        Импорт
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setAddOpen(true)}>
                        <Plus className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                        Добавить клиента
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Импорт */}
            <Dialog
              open={importOpen}
              onOpenChange={(open) => {
                if (!open) {
                  importFileInputRef.current?.blur();
                  if (importFileInputRef.current) importFileInputRef.current.value = "";
                }
                setImportOpen(open);
              }}
            >
              <DialogContent
                className={
                  importHeaders.length > 0
                    ? "max-w-none w-full h-[100dvh] max-h-[100dvh] min-h-0 left-0 top-0 translate-x-0 translate-y-0 rounded-none flex flex-col overflow-hidden gap-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:p-6"
                    : "max-w-2xl max-h-[90vh] overflow-y-auto"
                }
              >
                <DialogHeader
                  className={importHeaders.length > 0 ? "shrink-0 text-left" : undefined}
                >
                  <DialogTitle>Импорт клиентов</DialogTitle>
                  <DialogDescription>
                    {importHeaders.length === 0
                      ? "Загрузите CSV, XLSX, JSON или импортируйте данные с первого листа Google Таблицы (заголовки — в первой строке листа)."
                      : "Сопоставьте колонки с полями и нажмите «Импортировать»."}
                  </DialogDescription>
                </DialogHeader>
                <div
                  className={
                    importHeaders.length > 0
                      ? "space-y-4 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
                      : "space-y-4"
                  }
                >
                  {importHeaders.length === 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <Label className="text-sm">Файл</Label>
                          <p className="text-xs text-muted-foreground">
                            Поддерживаются CSV, XLSX и JSON. В CSV разделитель колонок определяется
                            автоматически (запятая, «;» как в Excel при русской локали, или табуляция).
                            Для дат используйте формат из шаблона.
                          </p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
                          <Download className="mr-2 h-4 w-4" />
                          Шаблон
                        </Button>
                      </div>

                      <button
                        type="button"
                        onClick={() => importFileInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (!file || !importFileInputRef.current) return;
                          const dt = new DataTransfer();
                          dt.items.add(file);
                          importFileInputRef.current.files = dt.files;
                          importFileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
                        }}
                        className="group w-full flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-4 py-6 text-center transition-colors hover:border-primary/60 hover:bg-muted/60"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <UploadCloud className="h-5 w-5" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-foreground">
                            Перетащите файл сюда или нажмите, чтобы выбрать
                          </p>
                          <p className="text-xs text-muted-foreground">
                            CSV, XLSX или JSON, размером до 10 МБ.
                          </p>
                        </div>
                        {importFileName && (
                          <p className="mt-1 text-xs text-muted-foreground break-all">
                            Выбран файл: <span className="font-medium">{importFileName}</span>
                          </p>
                        )}
                        <Input
                          ref={importFileInputRef}
                          type="file"
                          accept=".csv,.xlsx,.json"
                          className="sr-only"
                          onChange={handleImportFile}
                        />
                      </button>

                      <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase text-muted-foreground">
                          <span className="bg-background px-2">или</span>
                        </div>
                      </div>

                      <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <Label className="text-sm font-medium">Google Таблицы</Label>
                          </div>
                          {googleSheetsOAuthConfigured && googleSheetsGoogleConnected ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-muted-foreground"
                              onClick={() => void handleDisconnectGoogleSheets()}
                            >
                              Отключить Google
                            </Button>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Читается первый лист таблицы; первая строка — заголовки колонок (как в шаблоне
                          CSV). Доступ к файлам — с вашего Google-аккаунта, без расшаривания на
                          технические email.
                        </p>
                        {googleSheetsOAuthConfigured === false ? (
                          <Alert variant="destructive" className="py-2">
                            <AlertDescription className="text-xs">
                              На сервере не заданы{" "}
                              <code className="rounded bg-muted px-1">GOOGLE_CLIENT_ID</code>,{" "}
                              <code className="rounded bg-muted px-1">GOOGLE_CLIENT_SECRET</code> и{" "}
                              <code className="rounded bg-muted px-1">NEXTAUTH_URL</code> — обратитесь к
                              администратору.
                            </AlertDescription>
                          </Alert>
                        ) : null}
                        {googleSheetsOAuthConfigured && !googleSheetsGoogleConnected ? (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <p className="text-xs text-muted-foreground">
                              Один раз разрешите приложению чтение таблиц — как обычный вход через Google.
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              className="shrink-0 w-fit"
                              onClick={() => {
                                window.location.href = "/api/psychologist/google-sheets/oauth/start";
                              }}
                            >
                              Подключить Google
                            </Button>
                          </div>
                        ) : null}
                        {googleSheetsOAuthConfigured && googleSheetsGoogleConnected ? (
                          <div className="space-y-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full sm:w-auto"
                              disabled={googleSheetsPickerLoading || googleSheetsImportLoading}
                              onClick={() => void handleOpenGoogleSheetsPicker()}
                            >
                              {googleSheetsPickerLoading ? "Открываем выбор…" : "Выбрать таблицу…"}
                            </Button>
                            {!process.env.NEXT_PUBLIC_GOOGLE_API_KEY ? (
                              <p className="text-xs text-amber-800 dark:text-amber-200/90">
                                Чтобы открывалось стандартное окно Google, задайте в настройках сервера
                                переменную{" "}
                                <code className="rounded bg-muted px-1">NEXT_PUBLIC_GOOGLE_API_KEY</code>{" "}
                                (ключ API в Google Cloud → ограничение по HTTP referrer). Иначе вставьте
                                ссылку на таблицу ниже.
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Откроется окно Google: выберите файл таблицы или укажите ссылку вручную
                                ниже.
                              </p>
                            )}
                          </div>
                        ) : null}
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                          <div className="min-w-0 flex-1 space-y-1">
                            <Label htmlFor="google-import-url" className="text-xs">
                              Ссылка на таблицу (если не выбирали выше)
                            </Label>
                            <Input
                              id="google-import-url"
                              placeholder="https://docs.google.com/spreadsheets/d/..."
                              value={googleSheetsImportUrl}
                              onChange={(e) => setGoogleSheetsImportUrl(e.target.value)}
                              disabled={googleSheetsImportLoading || googleSheetsPickerLoading}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            className="shrink-0"
                            disabled={
                              googleSheetsImportLoading ||
                              googleSheetsPickerLoading ||
                              !googleSheetsOAuthConfigured ||
                              !googleSheetsGoogleConnected
                            }
                            onClick={() => void handleImportFromGoogleSheets()}
                          >
                            {googleSheetsImportLoading ? "Загрузка…" : "Загрузить из Google Таблицы"}
                          </Button>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Файлы CSV/XLSX/JSON разбираются в браузере. Импорт из Google выполняется на сервере
                        с вашего разрешения (OAuth).
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 border-b border-border pb-3">
                      <div className="min-w-0 space-y-1">
                        {importFileName ? (
                          <p
                            className="text-xs text-muted-foreground truncate"
                            title={importFileName}
                          >
                            <span className="font-medium text-foreground">{importFileName}</span>
                          </p>
                        ) : null}
                        <p className="text-sm text-muted-foreground">
                          Найдено колонок: {importHeaders.length}, строк: {importRows.length}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={resetImportSourceSelection}
                      >
                        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                        Другой файл или таблица
                      </Button>
                    </div>
                  )}
                  {importHeaders.length > 0 && (
                    <>
                      <div className="flex shrink-0 flex-col space-y-2">
                        <Label className="text-sm shrink-0">Сопоставление полей</Label>
                        <div className="max-w-full overflow-x-auto rounded-md border">
                          <table className="w-full min-w-max border-collapse text-xs">
                            <thead>
                              <tr>
                                {importHeaders.map((_, colIndex) => {
                                  const fieldOptions = [
                                    ...IMPORT_FIELDS,
                                    ...importCustomDefs.map((d) => ({
                                      key: `custom:${d.label}`,
                                      label: d.label
                                    }))
                                  ];
                                  const currentKey =
                                    Object.entries(importMapping).find(
                                      ([, idx]) => idx === colIndex
                                    )?.[0] ?? "__none__";
                                  return (
                                    <th
                                      key={colIndex}
                                      className="border-b bg-muted/40 px-2 py-1 align-bottom"
                                    >
                                      <Select
                                        value={currentKey}
                                        onValueChange={(fieldKey) =>
                                          setImportMapping((prev) => {
                                            const next = { ...prev };
                                            // убрать предыдущие сопоставления для этого столбца
                                            for (const [k, idx] of Object.entries(next)) {
                                              if (idx === colIndex) {
                                                delete next[k];
                                              }
                                            }
                                            if (fieldKey === "__none__") {
                                              return next;
                                            }
                                            // один наше поле не должно быть привязано к двум столбцам
                                            delete next[fieldKey];
                                            next[fieldKey] = colIndex;
                                            return next;
                                          })
                                        }
                                      >
                                        <SelectTrigger className="w-full">
                                          <SelectValue placeholder="— не импортировать" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="__none__">— не импортировать</SelectItem>
                                          {fieldOptions.map((opt) => (
                                            <SelectItem key={opt.key} value={opt.key}>
                                              {opt.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </th>
                                  );
                                })}
                              </tr>
                              <tr>
                                {importHeaders.map((h, i) => (
                                  <th
                                    key={i}
                                    className="border-b bg-muted px-2 py-1 text-left font-medium"
                                  >
                                    {h || `Колонка ${i + 1}`}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {importRows.slice(0, 5).map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                  {importHeaders.map((_, colIndex) => (
                                    <td
                                      key={colIndex}
                                      className="border-t px-2 py-1 text-[11px] text-muted-foreground"
                                    >
                                      {String(row[colIndex] ?? "")}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={importSkipDuplicates}
                          onChange={(e) => setImportSkipDuplicates(e.target.checked)}
                        />
                        Пропускать дубликаты по email
                      </label>
                      {importResult && (
                        <div className="space-y-2">
                          <Alert variant={importResult.failed > 0 ? "destructive" : "default"}>
                            <AlertDescription>
                              Создано: {importResult.created}
                              {(importResult.updated ?? 0) > 0 && `, обновлено: ${importResult.updated}`}
                              {importResult.skipped > 0 && `, пропущено: ${importResult.skipped}`}
                              {importResult.failed > 0 && `, ошибок: ${importResult.failed}`}.
                              {importResult.errors.length > 0 && (
                                <ul className="mt-2 list-inside text-xs">
                                  {importResult.errors.slice(0, 10).map((e, i) => (
                                    <li key={i}>
                                      Строка {e.row}: {e.message}
                                    </li>
                                  ))}
                                  {importResult.errors.length > 10 && (
                                    <li>… и ещё {importResult.errors.length - 10}</li>
                                  )}
                                </ul>
                              )}
                            </AlertDescription>
                          </Alert>
                          {importResult.warnings && importResult.warnings.length > 0 && (
                            <Alert variant="default">
                              <AlertDescription>
                                <span className="font-medium">Предупреждения:</span>
                                <ul className="mt-2 list-inside text-xs">
                                  {importResult.warnings.slice(0, 10).map((w, i) => (
                                    <li key={i}>
                                      Строка {w.row}: {w.message}
                                    </li>
                                  ))}
                                  {importResult.warnings.length > 10 && (
                                    <li>… и ещё {importResult.warnings.length - 10}</li>
                                  )}
                                </ul>
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <DialogFooter
                  className={importHeaders.length > 0 ? "shrink-0 gap-2 border-t border-border pt-4 sm:justify-end" : undefined}
                >
                  <Button variant="outline" onClick={() => setImportOpen(false)}>
                    Закрыть
                  </Button>
                  <Button
                    disabled={
                      importing ||
                      importRows.length === 0 ||
                      importMapping.firstName == null ||
                      importMapping.lastName == null
                    }
                    onClick={() => void handleImportSubmit()}
                  >
                    {importing ? "Импорт…" : "Импортировать"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Подтверждение массового удаления */}
            <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить выбранных клиентов?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Удалить {selectedIds.size}{" "}
                    {selectedIds.size === 1 ? "выбранного клиента" : "выбранных клиентов"}{" "}
                    из вашего списка? Их записи и тесты в системе сохранятся.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Удалить
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Loading / table / empty state */}
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-md" />
                ))}
              </div>
            ) : visibleClients.length === 0 ? (
              <div className="flex items-center justify-center rounded-xl border border-dashed bg-muted/40 px-6 py-10 text-center">
                <div className="space-y-3 max-w-md">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {clients.length === 0 ? "Клиентов пока нет" : "По выбранному фильтру клиентов нет"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {clients.length === 0
                        ? "Добавьте первого клиента вручную или импортируйте список из файла."
                        : "Смените вкладку статуса или добавьте клиента с подходящим статусом."}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <Button size="sm" onClick={() => setAddOpen(true)}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Добавить клиента
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setImportOpen(true)}
                    >
                      <UploadCloud className="mr-1.5 h-3.5 w-3.5" />
                      Импорт из файла
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={visibleClients}
                filterColumnId="search"
                filterPlaceholder="Поиск по имени, email или телефону..."
                columnLabels={{
                  status: "Статус",
                  name: "Имя",
                  dateOfBirth: "Дата рождения",
                  country: "Страна",
                  city: "Город",
                  gender: "Пол",
                  maritalStatus: "Семейное положение",
                  notes: "Заметки",
                  email: "Email",
                  phone: "Телефон",
                  createdAt: "Создан",
                  ...Object.fromEntries(tableCustomFieldDefs.map(d => [`custom:${d.label}`, d.label]))
                }}
                initialColumnVisibility={{
                  search: false,
                  dateOfBirth: false,
                  country: false,
                  city: false,
                  gender: false,
                  maritalStatus: false,
                  notes: false,
                  ...Object.fromEntries(tableCustomFieldDefs.map(d => [`custom:${d.label}`, false]))
                }}
                visibilityStorageKey="psychologist-clients-table-columns"
                minTableWidthClassName="min-w-[56rem] xl:min-w-[1500px]"
                initialColumnOrder={clientsTableColumnOrder}
                onColumnOrderPersist={persistClientsTableColumnOrder}
                onRowClick={
                  multiSelectMode
                    ? client => toggleOne(client.id)
                    : client => {
                        setProfileClient(client);
                        router.replace(`${pathname}?profile=${client.id}`);
                      }
                }
              />
            )}
          </div>
        </div>

        {/* Диалог добавления клиента */}
        <Dialog open={addOpen} onOpenChange={open => { setAddOpen(open); if (!open) setFormError(null); }}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Новый клиент</DialogTitle>
              <DialogDescription>
                Укажите основные данные. Email необязателен; если указан и клиент позже
                зарегистрируется с этим email — профиль автоматически свяжется с аккаунтом.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="add-email">Email (необязательно)</Label>
                <Input
                  id="add-email"
                  type="email"
                  placeholder="Для связки при регистрации клиента"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-firstName">Имя</Label>
                <Input
                  id="add-firstName"
                  required
                  value={form.firstName}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-lastName">Фамилия</Label>
                <Input
                  id="add-lastName"
                  required
                  value={form.lastName}
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Дата рождения</Label>
                <Popover open={addDobPopoverOpen} onOpenChange={setAddDobPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      type="button"
                      className="w-full justify-start text-left font-normal bg-card border-input hover:bg-card/90"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                      {dob ? (
                        dob.toLocaleDateString("ru-RU")
                      ) : (
                        <span className="text-muted-foreground">дд.мм.гггг</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto border-none bg-transparent p-0 shadow-none"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={dob}
                      onSelect={d => {
                        setDob(d);
                        if (shouldCloseCalendarPopoverAfterSelect()) setAddDobPopoverOpen(false);
                      }}
                      locale={ru}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="add-phone">Телефон</Label>
                <PhoneInput
                  id="add-phone"
                  value={form.phone}
                  onChange={value => setForm(f => ({ ...f, phone: value }))}
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="add-notes">Заметки</Label>
                <Textarea
                  id="add-notes"
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              {formError && (
                <Alert variant="destructive" className="md:col-span-2">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <DialogFooter className="md:col-span-2">
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Сохраняем..." : "Добавить клиента"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
    </TooltipProvider>
  );
}
