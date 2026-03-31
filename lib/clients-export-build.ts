import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { decryptClientNotesFromDb } from "@/lib/server-encryption/client-profile-storage";
import { decryptCustomFieldValueFromDb } from "@/lib/server-encryption/custom-field-storage";

/** Формат дат в экспорте: ДД.ММ.ГГГГ, при наличии времени — пробел и ЧЧ:ММ:СС. */
export function formatExportDate(value: Date | string | null | undefined): string {
  if (value == null) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const dd = pad(d.getDate());
  const mm = pad(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0;
  if (hasTime) {
    return `${dd}.${mm}.${yyyy} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
  return `${dd}.${mm}.${yyyy}`;
}

type SelectOption = { value: string; label: string };

function getSelectOptions(options: unknown): SelectOption[] {
  if (!options || typeof options !== "object") return [];
  const opts = (options as { selectOptions?: SelectOption[] }).selectOptions;
  return Array.isArray(opts) ? opts : [];
}

function isTruthy(raw: unknown): boolean {
  if (raw === true || raw === "true" || raw === 1) return true;
  return false;
}

/** Преобразует сырое значение в отображаемый текст (как в CSV/XLSX). */
export function valueToDisplay(
  raw: unknown,
  type: string,
  options: unknown
): string {
  if (raw == null && type !== "BOOLEAN") return "";
  const selectOptions = getSelectOptions(options);
  const valueToLabel = (v: string) => {
    const opt = selectOptions.find((o) => o.value === v);
    return opt ? opt.label : v;
  };
  if (type === "SELECT" && typeof raw === "string") {
    return valueToLabel(raw);
  }
  if (type === "MULTI_SELECT" && Array.isArray(raw)) {
    return raw.map((v) => valueToLabel(String(v))).join("; ");
  }
  if (type === "BOOLEAN") {
    return isTruthy(raw) ? "true" : "false";
  }
  if (type === "DATE") {
    return formatExportDate(
      typeof raw === "string" ? new Date(raw) : raw instanceof Date ? raw : null
    );
  }
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  if (Array.isArray(raw)) return raw.map((v) => valueToDisplay(v, type, options)).join("; ");
  if (typeof raw === "object") return JSON.stringify(raw);
  return String(raw);
}

function jsonValueToCsv(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(jsonValueToCsv).join("; ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export type ClientsExportTable = {
  headers: string[];
  rows: string[][];
  exportedCount: number;
};

/**
 * Таблица клиентов для CSV/XLSX/Google Sheets (одинаковые колонки).
 */
export async function buildClientsExportTable(
  psychologistId: string,
  statusId?: string | null
): Promise<ClientsExportTable> {
  const clients = await prisma.clientProfile.findMany({
    where: {
      psychologistId,
      ...(statusId ? { statusId } : {})
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      dateOfBirth: true,
      country: true,
      city: true,
      gender: true,
      maritalStatus: true,
      notes: true,
      createdAt: true,
      user: { select: { email: true } },
      status: { select: { label: true } }
    }
  });

  const defs = await prisma.customFieldDefinition.findMany({
    where: { psychologistId, target: "CLIENT" },
    orderBy: [{ group: "asc" }, { order: "asc" }, { createdAt: "asc" }],
    select: { id: true, label: true, type: true, options: true }
  });

  const clientIds = clients.map((c) => c.id);
  const definitionIds = defs.map((d) => d.id);

  const values =
    definitionIds.length > 0 && clientIds.length > 0
      ? await prisma.customFieldValue.findMany({
          where: {
            clientId: { in: clientIds },
            definitionId: { in: definitionIds }
          },
          select: { clientId: true, definitionId: true, value: true }
        })
      : [];

  const valueByClientDef = new Map<string, unknown>();
  for (const v of values) {
    if (v.clientId) {
      valueByClientDef.set(`${v.clientId}:${v.definitionId}`, v.value);
    }
  }

  const baseHeaders = [
    "Имя",
    "Фамилия",
    "Email",
    "Телефон",
    "Дата рождения",
    "Страна",
    "Город",
    "Пол",
    "Семейное положение",
    "Статус"
  ];
  const customHeaders = defs.map((d) => d.label);
  const tailHeaders = ["Заметки", "Дата добавления"];
  const headers = [...baseHeaders, ...customHeaders, ...tailHeaders];

  const rows: string[][] = [];
  for (const c of clients) {
    const email = c.user?.email ?? c.email ?? "";
    const dob = formatExportDate(c.dateOfBirth);
    const created = formatExportDate(c.createdAt);
    const baseRow = [
      c.firstName,
      c.lastName,
      email,
      c.phone ?? "",
      dob,
      c.country ?? "",
      c.city ?? "",
      c.gender ?? "",
      c.maritalStatus ?? "",
      c.status?.label ?? ""
    ];
    const customRow = defs.map((d) => {
      const rawStored = valueByClientDef.get(`${c.id}:${d.id}`);
      const raw =
        rawStored === undefined || rawStored === null
          ? null
          : decryptCustomFieldValueFromDb(rawStored as Prisma.JsonValue);
      const display =
        d.type === "SELECT" || d.type === "MULTI_SELECT" || d.type === "BOOLEAN" || d.type === "DATE"
          ? valueToDisplay(raw, d.type, d.options)
          : jsonValueToCsv(raw);
      return display;
    });
    const tailRow = [decryptClientNotesFromDb(c.notes) ?? "", created];
    rows.push([...baseRow, ...customRow, ...tailRow]);
  }

  return { headers, rows, exportedCount: clients.length };
}
