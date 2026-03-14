import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

function escapeCsvCell(value: string): string {
  const s = String(value ?? "");
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
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

/** Преобразует сырое значение в отображаемый текст (для SELECT/MULTI_SELECT — подпись варианта, не ключ; для BOOLEAN — "true"/"false"). */
function valueToDisplay(
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

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { role?: string }).role !== "PSYCHOLOGIST") {
      return NextResponse.json({ message: "Доступ запрещён" }, { status: 403 });
    }

    const userId = (session.user as { id?: string }).id as string;
    const profile = await prisma.psychologistProfile.findUnique({
      where: { userId },
      select: { id: true }
    });
    if (!profile) {
      return NextResponse.json({ message: "Профиль не найден" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const statusId = searchParams.get("statusId") ?? undefined;
    const format = (searchParams.get("format") ?? "csv").toLowerCase();

    const clients = await prisma.clientProfile.findMany({
      where: {
        psychologistId: profile.id,
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
      where: { psychologistId: profile.id, target: "CLIENT" },
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

    const dateStr = new Date().toISOString().slice(0, 10);

    if (format === "json") {
      const jsonItems = clients.map((c) => {
        const customFields: Record<string, unknown> = {};
        for (const d of defs) {
          const raw = valueByClientDef.get(`${c.id}:${d.id}`);
          if (raw === undefined || raw === null) continue;
          const display =
            d.type === "SELECT" || d.type === "MULTI_SELECT"
              ? valueToDisplay(raw, d.type, d.options)
              : d.type === "BOOLEAN"
                ? isTruthy(raw)
                : raw;
          customFields[d.label] = display;
        }
        return {
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.user?.email ?? c.email ?? null,
          phone: c.phone ?? null,
          dateOfBirth: c.dateOfBirth?.toISOString() ?? null,
          country: c.country ?? null,
          city: c.city ?? null,
          gender: c.gender ?? null,
          maritalStatus: c.maritalStatus ?? null,
          status: c.status?.label ?? null,
          customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
          notes: c.notes ?? null,
          createdAt: c.createdAt.toISOString()
        };
      });
      const json = JSON.stringify(jsonItems, null, 2);
      const filename = `clients-${dateStr}.json`;
      return new NextResponse(json, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`
        }
      });
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
      const dob = c.dateOfBirth
        ? new Date(c.dateOfBirth).toLocaleDateString("ru-RU")
        : "";
      const created = new Date(c.createdAt).toLocaleDateString("ru-RU");
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
        const raw = valueByClientDef.get(`${c.id}:${d.id}`);
        const display =
          d.type === "SELECT" || d.type === "MULTI_SELECT" || d.type === "BOOLEAN"
            ? valueToDisplay(raw, d.type, d.options)
            : jsonValueToCsv(raw);
        return display;
      });
      const tailRow = [c.notes ?? "", created];
      rows.push([...baseRow, ...customRow, ...tailRow]);
    }

    if (format === "xlsx") {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Клиенты");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      const filename = `clients-${dateStr}.xlsx`;
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`
        }
      });
    }

    const BOM = "\uFEFF";
    const headerLine = headers.map(escapeCsvCell).join(",");
    const dataLines = rows.map((row) => row.map(escapeCsvCell).join(","));
    const csv = BOM + [headerLine, ...dataLines].join("\r\n");

    const filename = `clients-${dateStr}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (err) {
    console.error("[GET /api/psychologist/clients/export]", err);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
