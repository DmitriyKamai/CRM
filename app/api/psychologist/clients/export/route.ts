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
      select: { id: true, label: true }
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
        const val = valueByClientDef.get(`${c.id}:${d.id}`);
        return jsonValueToCsv(val);
      });
      const tailRow = [c.notes ?? "", created];
      rows.push([...baseRow, ...customRow, ...tailRow]);
    }

    const BOM = "\uFEFF";
    const headerLine = headers.map(escapeCsvCell).join(",");
    const dataLines = rows.map((row) => row.map(escapeCsvCell).join(","));
    const csv = BOM + [headerLine, ...dataLines].join("\r\n");

    const filename = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
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
