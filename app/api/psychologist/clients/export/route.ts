import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { safeLogAudit } from "@/lib/audit-log";
import {
  buildClientsExportTable,
  formatExportDate,
  valueToDisplay
} from "@/lib/clients-export-build";
import { buildClientsXlsxBuffer } from "@/lib/clients-xlsx-build";
import { prisma } from "@/lib/db";
import { getClientIp, requirePsychologist } from "@/lib/security/api-guards";
import { decryptClientNotesFromDb } from "@/lib/server-encryption/client-profile-storage";
import { decryptCustomFieldValueFromDb } from "@/lib/server-encryption/custom-field-storage";

function escapeCsvCell(value: string): string {
  const s = String(value ?? "");
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function isTruthy(raw: unknown): boolean {
  if (raw === true || raw === "true" || raw === 1) return true;
  return false;
}

export async function GET(request: Request) {
  try {
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;
    const profile = { id: ctx.psychologistId };
    const ip = getClientIp(request);

    const { searchParams } = new URL(request.url);
    const statusId = searchParams.get("statusId") ?? undefined;
    const format = (searchParams.get("format") ?? "csv").toLowerCase();

    const d = new Date();
    const dateStr = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;

    if (format === "json") {
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

      const jsonItems = clients.map((c) => {
        const customFields: Record<string, unknown> = {};
        for (const d of defs) {
          const rawStored = valueByClientDef.get(`${c.id}:${d.id}`);
          if (rawStored === undefined || rawStored === null) continue;
          const raw = decryptCustomFieldValueFromDb(rawStored as Prisma.JsonValue);
          if (raw === undefined || raw === null) continue;
          const display =
            d.type === "SELECT" || d.type === "MULTI_SELECT"
              ? valueToDisplay(raw, d.type, d.options)
              : d.type === "BOOLEAN"
                ? isTruthy(raw)
                : d.type === "DATE"
                  ? formatExportDate(
                      typeof raw === "string" ? new Date(raw) : raw instanceof Date ? raw : null
                    ) || null
                  : raw;
          customFields[d.label] = display;
        }
        return {
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.user?.email ?? c.email ?? null,
          phone: c.phone ?? null,
          dateOfBirth: formatExportDate(c.dateOfBirth) || null,
          country: c.country ?? null,
          city: c.city ?? null,
          gender: c.gender ?? null,
          maritalStatus: c.maritalStatus ?? null,
          status: c.status?.label ?? null,
          customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
          notes: decryptClientNotesFromDb(c.notes),
          createdAt: formatExportDate(c.createdAt)
        };
      });
      const json = JSON.stringify(jsonItems, null, 2);
      const filename = `clients-${dateStr}.json`;
      await safeLogAudit({
        action: "CLIENTS_EXPORT",
        actorUserId: ctx.userId,
        actorRole: ctx.user.role ?? "PSYCHOLOGIST",
        targetType: "PsychologistProfile",
        targetId: profile.id,
        ip,
        meta: {
          format: "json",
          statusId: statusId ?? null,
          exportedCount: clients.length
        }
      });
      return new NextResponse(json, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`
        }
      });
    }

    const { headers, rows, exportedCount } = await buildClientsExportTable(
      profile.id,
      statusId ?? null
    );

    if (format === "xlsx") {
      const buf = await buildClientsXlsxBuffer(headers, rows);
      const filename = `clients-${dateStr}.xlsx`;
      await safeLogAudit({
        action: "CLIENTS_EXPORT",
        actorUserId: ctx.userId,
        actorRole: ctx.user.role ?? "PSYCHOLOGIST",
        targetType: "PsychologistProfile",
        targetId: profile.id,
        ip,
        meta: {
          format: "xlsx",
          statusId: statusId ?? null,
          exportedCount
        }
      });
      return new NextResponse(new Uint8Array(buf), {
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
    await safeLogAudit({
      action: "CLIENTS_EXPORT",
      actorUserId: ctx.userId,
      actorRole: ctx.user.role ?? "PSYCHOLOGIST",
      targetType: "PsychologistProfile",
      targetId: profile.id,
      ip,
      meta: {
        format: "csv",
        statusId: statusId ?? null,
        exportedCount
      }
    });
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
