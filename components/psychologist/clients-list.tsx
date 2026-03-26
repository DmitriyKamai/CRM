"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar as CalendarIcon,
  ArrowUpDown,
  UserCheck,
  Users,
  Plus,
  UploadCloud,
} from "lucide-react";
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
import { ClientsImportDialog } from "@/components/psychologist/clients-import-dialog";
import { ClientsActionsToolbar } from "@/components/psychologist/clients-actions-toolbar";
import { ClientsProfileOverlay } from "@/components/psychologist/clients-profile-overlay";
import { cn } from "@/lib/utils";
import { shouldCloseCalendarPopoverAfterSelect } from "@/lib/close-calendar-popover";
import { useClientsData, type ClientDto } from "@/hooks/use-clients-data";
import {
  useClientsImport,
  type ClientsImportCustomDef,
  type ClientsImportField
} from "@/hooks/use-clients-import";
import { useClientsExport } from "@/hooks/use-clients-export";

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

const IMPORT_FIELDS: ClientsImportField[] = [
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

  const {
    clients,
    clientsLoading: loading,
    clientsError,
    statuses,
    customFieldDefs: tableCustomFieldDefs,
    columnOrder: clientsTableColumnOrder,
    persistColumnOrder: persistClientsTableColumnOrder,
    createClient,
    deleteClient,
    bulkDeleteClients,
    updateClientInCache,
    invalidateClients
  } = useClientsData();

  const [error, setError] = useState<string | null>(clientsError);

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
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const MIN_LIST_WIDTH = 1;
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const listInnerRef = useRef<HTMLDivElement | null>(null);
  const [listScale, setListScale] = useState(1);
  const [listInnerHeight, setListInnerHeight] = useState(0);
  const [googleSheetsOAuthConfigured, setGoogleSheetsOAuthConfigured] = useState<boolean | null>(
    null
  );
  const [googleSheetsGoogleConnected, setGoogleSheetsGoogleConnected] = useState<boolean | null>(
    null
  );

  const [importOpen, setImportOpen] = useState(false);
  const [importCustomDefs, setImportCustomDefs] = useState<ClientsImportCustomDef[]>([]);

  const clientsImport = useClientsImport({
    importFields: IMPORT_FIELDS,
    importOpen,
    setImportOpen,
    importCustomDefs,
    setImportCustomDefs,
    onImported: invalidateClients,
    setGlobalError: setError,
    pathname,
    routerReplace: router.replace,
    searchParamsToString: () => searchParams.toString()
  });

  const syncGoogleSheetsFromServer = useCallback(async () => {
    try {
      const res = await fetch("/api/psychologist/google-sheets");
      if (!res.ok) return;
      const data = (await res.json().catch(() => null)) as {
        oauthConfigured?: boolean;
        googleConnected?: boolean;
      } | null;
      setGoogleSheetsOAuthConfigured(Boolean(data?.oauthConfigured));
      setGoogleSheetsGoogleConnected(Boolean(data?.googleConnected));
    } catch {
      setGoogleSheetsOAuthConfigured(false);
      setGoogleSheetsGoogleConnected(false);
    }
  }, []);

  const clientsExport = useClientsExport({
    clientsCount: clients.length,
    statusFilter,
    googleSheetsOAuthConfigured,
    googleSheetsGoogleConnected,
    setGoogleSheetsOAuthConfigured: (v) => setGoogleSheetsOAuthConfigured(v),
    setGoogleSheetsGoogleConnected: (v) => setGoogleSheetsGoogleConnected(v),
    syncGoogleSheetsFromServer,
    setError
  });

  useEffect(() => {
    void syncGoogleSheetsFromServer();
  }, [syncGoogleSheetsFromServer]);

  useEffect(() => {
    const el = listContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
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
      await createClient.mutateAsync(body);
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
    setError(null);
    try {
      await bulkDeleteClients.mutateAsync(Array.from(selectedIds));
      setSelectedIds(new Set());
      setMultiSelectMode(false);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Не удалось удалить выбранных клиентов");
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
      <ClientsProfileOverlay
        client={profileClient}
        schedulingEnabled={schedulingEnabled}
        diagnosticsEnabled={diagnosticsEnabled}
        onBack={() => {
          setProfileClient(null);
          router.replace(pathname);
        }}
        onInvalidateClients={invalidateClients}
        onUpdateClientInCache={updateClientInCache}
        onLocalPatchClient={(patch) =>
          setProfileClient((prev) => (prev ? { ...prev, ...patch } : prev))
        }
        deleteClientById={async (clientId) => {
          setError(null);
          try {
            await deleteClient.mutateAsync(clientId);
          } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Не удалось удалить клиента");
            throw err;
          }
        }}
      />
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
            {/* До lg — колонка; на md+ с узким main (при старом брейкпоинте сайдбара) тулбар ломался — см. AppShell lg */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-2">
              <div className="flex min-w-0 w-full flex-col gap-1 lg:max-w-xl lg:pr-2">
                <p className="text-pretty text-sm leading-snug text-muted-foreground">
                  Нажмите на строку, чтобы открыть профиль клиента.
                </p>
                {multiSelectMode && selectedIds.size > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Выбрано клиентов: {selectedIds.size}
                  </p>
                )}
              </div>
              <ClientsActionsToolbar
                clientsCount={clients.length}
                googleSheetsOAuthConfigured={googleSheetsOAuthConfigured}
                exporting={clientsExport.exporting}
                onExport={clientsExport.handleExport}
                onExportGoogleSheets={clientsExport.handleExportGoogleSheets}
                multiSelectMode={multiSelectMode}
                selectedCount={selectedIds.size}
                bulkDeleting={bulkDeleteClients.isPending}
                onEnableMultiSelect={() => {
                  setSelectedIds(new Set());
                  setMultiSelectMode(true);
                }}
                onCancelMultiSelect={() => {
                  setSelectedIds(new Set());
                  setMultiSelectMode(false);
                }}
                onOpenBulkDeleteDialog={openBulkDeleteDialog}
                onOpenImport={() => setImportOpen(true)}
                onOpenAddClient={() => setAddOpen(true)}
              />
            </div>

            {/* Импорт */}
            <ClientsImportDialog
              open={importOpen}
              onOpenChange={setImportOpen}
              error={error}
              importFields={IMPORT_FIELDS}
              importCustomDefs={importCustomDefs}
              importHeaders={clientsImport.importHeaders}
              importRows={clientsImport.importRows}
              importMapping={clientsImport.importMapping}
              setImportMapping={clientsImport.setImportMapping}
              importSkipDuplicates={clientsImport.importSkipDuplicates}
              setImportSkipDuplicates={clientsImport.setImportSkipDuplicates}
              importing={clientsImport.importing}
              importResult={clientsImport.importResult}
              importFileName={clientsImport.importFileName}
              importFileInputRef={clientsImport.importFileInputRef}
              googleSheetsImportUrl={clientsImport.googleSheetsImportUrl}
              setGoogleSheetsImportUrl={clientsImport.setGoogleSheetsImportUrl}
              googleSheetsImportLoading={clientsImport.googleSheetsImportLoading}
              googleSheetsPickerLoading={clientsImport.googleSheetsPickerLoading}
              googleSheetsOAuthConfigured={clientsImport.googleSheetsOAuthConfigured}
              googleSheetsGoogleConnected={clientsImport.googleSheetsGoogleConnected}
              onImportFileChange={clientsImport.handleImportFile}
              onResetSource={clientsImport.resetImportSourceSelection}
              onSubmit={clientsImport.handleImportSubmit}
              onImportFromGoogleSheets={clientsImport.handleImportFromGoogleSheets}
              onOpenGoogleSheetsPicker={clientsImport.handleOpenGoogleSheetsPicker}
              onDisconnectGoogleSheets={clientsImport.handleDisconnectGoogleSheets}
              onDownloadTemplate={downloadTemplate}
            />

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
