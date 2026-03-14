"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar as CalendarIcon, ArrowUpDown, UserCheck, Users, Plus, Trash2, Pencil, X, Search, Download, ChevronDown, Upload } from "lucide-react";
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
import { PhoneInput, formatPhoneDisplay } from "@/components/ui/phone-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PsychologistClientProfile } from "@/components/psychologist/client-profile";
import { cn } from "@/lib/utils";

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

export function PsychologistClientsList() {
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [profileClient, setProfileClient] = useState<ClientDto | null>(null);

  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [dob, setDob] = useState<Date | undefined>(undefined);
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
  const [initialStatusId, setInitialStatusId] = useState<string | null>(null);

  const MIN_LIST_WIDTH = 720;
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const listInnerRef = useRef<HTMLDivElement | null>(null);
  const [listScale, setListScale] = useState(1);
  const [listInnerHeight, setListInnerHeight] = useState(0);
  const [singleDeleteDialogOpen, setSingleDeleteDialogOpen] = useState(false);
  const [singleDeleting, setSingleDeleting] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  const [importOpen, setImportOpen] = useState(false);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<(string | number | boolean)[][]>([]);
  const [importMapping, setImportMapping] = useState<Record<string, number>>({});
  const [importCustomDefs, setImportCustomDefs] = useState<Array<{ id: string; label: string }>>([]);
  const [importSkipDuplicates, setImportSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number;
    skipped: number;
    failed: number;
    errors: { row: number; message: string }[];
    warnings?: { row: number; message: string }[];
  } | null>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = listContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
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

  async function loadClients() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/psychologist/clients");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "Не удалось загрузить клиентов");
      }
      const data = (await res.json()) as { clients: ClientDto[] };
      setClients(data.clients);
      if (!initialStatusId && data.clients.length > 0) {
        setInitialStatusId(data.clients[0].statusId ?? null);
      }
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Не удалось загрузить клиентов");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClients();
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
    setProfileEditing(false);
  }, [profileClient?.id]);

  useEffect(() => {
    if (!importOpen) return;
    setImportResult(null);
    setImportHeaders([]);
    setImportRows([]);
    setImportMapping({});
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
  }, [importOpen]);

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

  function parseCSVLine(line: string): string[] {
    const out: string[] = [];
    let i = 0;
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
      } else {
        let cell = "";
        while (i < line.length && line[i] !== ",") {
          cell += line[i];
          i++;
        }
        out.push(cell.trim());
        i++;
      }
    }
    return out;
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
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
        const headers = parseCSVLine(lines[0]);
        const rows = lines.slice(1).map(parseCSVLine);
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
        const XLSX = await import("xlsx");
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });
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

  function toggleAll(checked: boolean) {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(clients.map(c => c.id)));
  }

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
            <input
              type="checkbox"
              aria-label="Выбрать всех клиентов"
              checked={allSelected}
              ref={el => {
                if (el) {
                  el.indeterminate = someSelected;
                }
              }}
              onChange={e => toggleAll(e.target.checked)}
            />
          );
        },
        cell: ({ row }) =>
          multiSelectMode ? (
            <input
              type="checkbox"
              aria-label="Выбрать клиента"
              checked={selectedIds.has(row.original.id)}
              onChange={e => {
                e.stopPropagation();
                toggleOne(row.original.id);
              }}
              onClick={e => e.stopPropagation()}
            />
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
        header: () => (
          <span className="text-xs font-medium text-muted-foreground">Статус</span>
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
              className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium text-white"
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
          <Button
            variant="ghost"
            size="sm"
            className="h-8 pl-10 pr-0 text-xs font-medium text-muted-foreground justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Имя
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center gap-2 min-w-0">
              <ClientAvatar client={c} size="sm" />
              <span className="font-medium inline-flex items-center gap-1.5 truncate">
                <span className="truncate">
                  {c.lastName} {c.firstName}
                </span>
                {c.hasAccount === true && (
                  <TooltipProvider>
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
                  </TooltipProvider>
                )}
              </span>
            </div>
          );
        }
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-0 text-xs font-medium text-muted-foreground justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Email
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.email ?? "—"}</span>
        )
      },
      {
        accessorKey: "phone",
        header: () => (
          <span className="text-xs font-medium text-muted-foreground">Телефон</span>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatPhoneDisplay(row.original.phone)}
          </span>
        )
      },
      {
        id: "createdAt",
        accessorFn: row => row.createdAt,
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-0 text-xs font-medium text-muted-foreground justify-start"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Создан
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleDateString("ru-RU")}
          </span>
        )
      }
    ],
    [clients, selectedIds, multiSelectMode]
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
              onClick={() => setProfileClient(null)}
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

  return (
    <div className="px-6 py-4">
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
                <TabsList className="inline-flex h-9 rounded-full bg-muted px-1 py-0.5">
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
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">
                  Нажмите на строку, чтобы открыть профиль клиента.
                </p>
                {multiSelectMode && selectedIds.size > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Выбрано клиентов: {selectedIds.size}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
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
              <DialogContent className="max-w-[100vw] max-h-[100vh] w-screen h-screen overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Импорт клиентов</DialogTitle>
                  <DialogDescription>
                    Загрузите CSV, XLSX или JSON (массив объектов). Сопоставьте колонки с полями и нажмите «Импортировать».
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm">Файл</Label>
                    <Input
                      ref={importFileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.json"
                      className="mt-1"
                      onChange={handleImportFile}
                    />
                  </div>
                  {importHeaders.length > 0 && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Найдено колонок: {importHeaders.length}, строк: {importRows.length}
                      </p>
                      <div className="space-y-2">
                        <Label className="text-sm">Сопоставление полей</Label>
                        <div className="overflow-x-auto rounded-md border">
                          <table className="w-full border-collapse text-xs">
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
                              Создано: {importResult.created}, пропущено: {importResult.skipped}
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
                <DialogFooter>
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
            ) : clients.length === 0 ? (
              <div className="flex h-24 items-center justify-center rounded-md border bg-card/70 text-sm text-muted-foreground">
                Клиентов пока нет. Нажмите «Добавить клиента», чтобы создать первого.
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={
                  statusFilter === "ALL"
                    ? clients
                    : clients.filter((c) => c.statusId === statusFilter)
                }
                filterColumnId="search"
                filterPlaceholder="Поиск по имени, email или телефону..."
                columnLabels={{
                  name: "Имя",
                  email: "Email",
                  phone: "Телефон",
                  createdAt: "Создан"
                }}
                onRowClick={client => setProfileClient(client)}
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
                <Popover>
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
                      onSelect={setDob}
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
  );
}
