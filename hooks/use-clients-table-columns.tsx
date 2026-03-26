"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, UserCheck } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatPhoneDisplay, phoneToTelHref } from "@/components/ui/phone-input";
import { cn } from "@/lib/utils";
import type { ClientDto } from "@/hooks/use-clients-data";

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

const CLIENTS_TABLE_SORT_HEADER_BTN_CLASS =
  "inline-flex h-8 w-max max-w-full shrink-0 items-center justify-start gap-1.5 rounded-md px-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground";

type CustomFieldDefLike = { label: string };

function getClientColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

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

function ClientAvatar({ client, size = "md" }: { client: ClientDto; size?: "sm" | "md" }) {
  const initials = `${client.firstName[0] ?? ""}${client.lastName[0] ?? ""}`.toUpperCase();
  const color = getClientColor(client.id);
  return (
    <Avatar
      className={cn("shrink-0 border border-border", size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm")}
    >
      <AvatarImage
        src={client.avatarUrl ?? undefined}
        alt={`${client.firstName} ${client.lastName}`}
        className="object-cover"
      />
      <AvatarFallback className={cn("flex items-center justify-center font-semibold", color)}>
        {initials || "?"}
      </AvatarFallback>
    </Avatar>
  );
}

export function getClientsColumnLabels(tableCustomFieldDefs: CustomFieldDefLike[]) {
  return {
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
    ...Object.fromEntries(tableCustomFieldDefs.map((d) => [`custom:${d.label}`, d.label]))
  };
}

export function getClientsInitialColumnVisibility(tableCustomFieldDefs: CustomFieldDefLike[]) {
  return {
    search: false,
    dateOfBirth: false,
    country: false,
    city: false,
    gender: false,
    maritalStatus: false,
    notes: false,
    ...Object.fromEntries(tableCustomFieldDefs.map((d) => [`custom:${d.label}`, false]))
  };
}

export function useClientsTableColumns(opts: {
  clientsCount: number;
  selectedIds: Set<string>;
  multiSelectMode: boolean;
  toggleAll: (checked: boolean) => void;
  toggleOne: (id: string) => void;
  tableCustomFieldDefs: CustomFieldDefLike[];
}) {
  const { clientsCount, selectedIds, multiSelectMode, toggleAll, toggleOne, tableCustomFieldDefs } = opts;

  const columns: ColumnDef<ClientDto>[] = useMemo(
    () => [
      {
        id: "select",
        header: () => {
          if (!multiSelectMode) return null;
          const allSelected = clientsCount > 0 && selectedIds.size === clientsCount;
          const someSelected = selectedIds.size > 0 && selectedIds.size < clientsCount;
          return (
            <Checkbox
              aria-label="Выбрать всех клиентов"
              checked={someSelected ? "indeterminate" : allSelected}
              onCheckedChange={(checked) => toggleAll(checked === true)}
            />
          );
        },
        cell: ({ row }) =>
          multiSelectMode ? (
            <div onClick={(e) => e.stopPropagation()} className="flex items-center">
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
      {
        id: "search",
        accessorFn: (row) =>
          `${row.lastName ?? ""} ${row.firstName ?? ""} ${row.email ?? ""} ${row.phone ?? ""}`,
        header: () => null,
        cell: () => null,
        enableHiding: false,
        enableSorting: false
      },
      {
        id: "status",
        accessorFn: (row) => row.statusLabel ?? "",
        enableHiding: false,
        header: () => (
          <span className="inline-block min-w-[8rem] text-xs font-medium text-muted-foreground whitespace-nowrap">
            Статус
          </span>
        ),
        cell: ({ row }) => {
          const { statusLabel, statusColor } = row.original;
          if (!statusLabel) return <span className="text-xs text-muted-foreground">—</span>;
          const displayLabel = statusLabel.length > 16 ? `${statusLabel.slice(0, 16)}…` : statusLabel;
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
        accessorFn: (row) => `${row.lastName} ${row.firstName}`,
        header: ({ column }) => (
          <div className="flex min-w-[14rem] items-center gap-2">
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
                    <TooltipContent>Клиент зарегистрирован</TooltipContent>
                  </Tooltip>
                )}
              </span>
            </div>
          );
        }
      },
      {
        id: "dateOfBirth",
        accessorFn: (row) => row.dateOfBirth ?? "",
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
              <span className="inline-block min-w-[8rem] text-muted-foreground whitespace-nowrap">
                {d.toLocaleDateString("ru-RU")}
              </span>
            );
          } catch {
            return <span className="text-muted-foreground">—</span>;
          }
        }
      },
      {
        accessorKey: "country",
        header: () => (
          <span className="inline-block min-w-[8rem] text-xs font-medium text-muted-foreground whitespace-nowrap">
            Страна
          </span>
        ),
        cell: ({ row }) => (
          <span
            className="inline-block max-w-[10rem] overflow-hidden text-ellipsis text-muted-foreground whitespace-nowrap"
            title={row.original.country ?? ""}
          >
            {row.original.country ?? "—"}
          </span>
        )
      },
      {
        accessorKey: "city",
        header: () => (
          <span className="inline-block min-w-[8rem] text-xs font-medium text-muted-foreground whitespace-nowrap">
            Город
          </span>
        ),
        cell: ({ row }) => (
          <span
            className="inline-block max-w-[10rem] overflow-hidden text-ellipsis text-muted-foreground whitespace-nowrap"
            title={row.original.city ?? ""}
          >
            {row.original.city ?? "—"}
          </span>
        )
      },
      {
        accessorKey: "gender",
        header: () => (
          <span className="inline-block min-w-[6rem] text-xs font-medium text-muted-foreground whitespace-nowrap">
            Пол
          </span>
        ),
        cell: ({ row }) => (
          <span className="inline-block min-w-[6rem] text-muted-foreground whitespace-nowrap">
            {row.original.gender ?? "—"}
          </span>
        )
      },
      {
        accessorKey: "maritalStatus",
        header: () => (
          <span className="inline-block min-w-[11rem] text-xs font-medium text-muted-foreground whitespace-nowrap">
            Семейное положение
          </span>
        ),
        cell: ({ row }) => (
          <span
            className="inline-block max-w-[12rem] overflow-hidden text-ellipsis text-muted-foreground whitespace-nowrap"
            title={row.original.maritalStatus ?? ""}
          >
            {row.original.maritalStatus ?? "—"}
          </span>
        )
      },
      {
        accessorKey: "notes",
        header: () => (
          <span className="inline-block min-w-[12rem] text-xs font-medium text-muted-foreground whitespace-nowrap">
            Заметки
          </span>
        ),
        cell: ({ row }) => {
          const n = row.original.notes;
          if (!n || !n.trim()) return <span className="text-muted-foreground">—</span>;
          const short = n.length > 40 ? `${n.slice(0, 40)}…` : n;
          return (
            <span
              className="inline-block max-w-[18rem] overflow-hidden text-ellipsis text-muted-foreground whitespace-nowrap"
              title={n}
            >
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
          <span className="inline-block min-w-[14rem] text-muted-foreground whitespace-nowrap">
            {row.original.email ?? "—"}
          </span>
        )
      },
      {
        accessorKey: "phone",
        header: () => (
          <span className="inline-block min-w-[10rem] text-xs font-medium text-muted-foreground whitespace-nowrap">
            Телефон
          </span>
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
              onClick={(e) => e.stopPropagation()}
            >
              {label}
            </a>
          );
        }
      },
      {
        id: "createdAt",
        accessorFn: (row) => row.createdAt,
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
      ...tableCustomFieldDefs.map((def) => ({
        id: `custom:${def.label}`,
        accessorFn: (row: ClientDto) => (row.customFields ?? {})[def.label],
        header: () => <span className="text-xs font-medium text-muted-foreground">{def.label}</span>,
        cell: ({ row }: { row: { original: ClientDto } }) => (
          <span
            className="inline-block max-w-[12rem] overflow-hidden text-ellipsis text-muted-foreground whitespace-nowrap"
            title={String((row.original.customFields ?? {})[def.label] ?? "")}
          >
            {formatCustomFieldValue((row.original.customFields ?? {})[def.label])}
          </span>
        )
      }))
    ],
    [clientsCount, selectedIds, multiSelectMode, tableCustomFieldDefs, toggleAll, toggleOne]
  );

  return { columns };
}

