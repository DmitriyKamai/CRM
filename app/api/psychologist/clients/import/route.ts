import { NextResponse } from "next/server";
import { z } from "zod";

import { safeLogAudit } from "@/lib/audit-log";
import { prisma } from "@/lib/db";
import { logZodError } from "@/lib/log-validation-error";
import { getClientIp, requirePsychologist } from "@/lib/security/api-guards";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function parseImportDate(input: string): Date | null {
  const s = input.trim();
  if (!s) return null;

  // Поддерживаем формат экспорта: ДД.ММ.ГГГГ и ДД.ММ.ГГГГ ЧЧ:ММ[:СС]
  const m = s.match(
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
  );
  if (m) {
    const [, ddStr, mmStr, yyyyStr, hhStr, minStr, ssStr] = m;
    const dd = Number(ddStr);
    const mm = Number(mmStr);
    const yyyy = Number(yyyyStr);
    const hh = hhStr != null ? Number(hhStr) : 0;
    const min = minStr != null ? Number(minStr) : 0;
    const ss = ssStr != null ? Number(ssStr) : 0;
    const d = new Date(yyyy, mm - 1, dd, hh, min, ss);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

const importRowSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().min(1, "Укажите имя"),
  lastName: z.string().min(1, "Укажите фамилию"),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  maritalStatus: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  customFields: z.record(z.string(), z.unknown()).optional()
});

const importBodySchema = z.object({
  clients: z.array(importRowSchema).min(1, "Добавьте хотя бы одну запись"),
  options: z
    .object({
      skipDuplicatesByEmail: z.boolean().optional()
    })
    .optional()
});

export async function POST(request: Request) {
  try {
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;
    const profile = { id: ctx.psychologistId };
    const ip = getClientIp(request);

    const json = await request.json().catch(() => null);
    const body = importBodySchema.parse(json ?? {});

    const statuses = await prisma.clientStatus.findMany({
      where: { psychologistId: profile.id },
      select: { id: true, label: true }
    });
    const statusByLabel = new Map(statuses.map((s) => [s.label, s.id]));

    const defaultStatus = await prisma.clientStatus.findFirst({
      where: { psychologistId: profile.id },
      orderBy: { order: "asc" },
      select: { id: true }
    });
    const defaultStatusId = defaultStatus?.id ?? null;

    const defs = await prisma.customFieldDefinition.findMany({
      where: { psychologistId: profile.id, target: "CLIENT" },
      select: { id: true, label: true, type: true, options: true }
    });
    const defByLabel = new Map(defs.map((d) => [d.label, d]));

    type SelectOpt = { value: string; label: string };
    function getSelectOptions(opts: unknown): SelectOpt[] {
      if (!opts || typeof opts !== "object") return [];
      const arr = (opts as { selectOptions?: SelectOpt[] }).selectOptions;
      return Array.isArray(arr) ? arr : [];
    }

    type LabelToValueResult = { value: unknown; warning?: string };

    function labelToValue(
      def: { type: string; options: unknown },
      display: unknown
    ): LabelToValueResult {
      if (display == null || display === "") return { value: null };
      if (def.type === "SELECT") {
        const opts = getSelectOptions(def.options);
        const s = String(display).trim();
        const found = opts.find((o) => o.label === s);
        if (found) return { value: found.value };
        return { value: null, warning: `значение «${s}» не найдено в списке опций` };
      }
      if (def.type === "MULTI_SELECT") {
        const opts = getSelectOptions(def.options);
        const parts = Array.isArray(display)
          ? display.map(String)
          : String(display).split(/;\s*/).map((x) => x.trim()).filter(Boolean);
        const matched: string[] = [];
        const unmatched: string[] = [];
        for (const p of parts) {
          const opt = opts.find((o) => o.label === p);
          if (opt) matched.push(opt.value);
          else unmatched.push(p);
        }
        const value = matched.length > 0 ? matched : null;
        const warning =
          unmatched.length > 0
            ? `значения «${unmatched.join("», «")}» не найдены в списке опций`
            : undefined;
        return { value, warning };
      }
      if (def.type === "BOOLEAN") {
        const v = display;
        return { value: v === true || v === "true" || v === "1" || v === 1 };
      }
      if (def.type === "DATE" && (typeof display === "string" || display instanceof Date)) {
        const d =
          typeof display === "string" ? parseImportDate(display) : (display as Date | null);
        return { value: d && !Number.isNaN(d.getTime()) ? d.toISOString() : null };
      }
      if (def.type === "NUMBER") {
        const n = Number(display);
        return { value: Number.isNaN(n) ? null : n };
      }
      return { value: display };
    }

    const errors: { row: number; message: string }[] = [];
    const warnings: { row: number; message: string }[] = [];
    let created = 0;
    let updated = 0;
    const skipped = 0;
    const skipDuplicates = body.options?.skipDuplicatesByEmail === true;

    for (let i = 0; i < body.clients.length; i++) {
      const rowIndex = i + 1;
      const row = body.clients[i];

      try {
        const emailRaw =
          row.email != null && String(row.email).trim() !== ""
            ? normalizeEmail(String(row.email).trim())
            : null;

        const dob =
          row.dateOfBirth != null && String(row.dateOfBirth).trim() !== ""
            ? parseImportDate(String(row.dateOfBirth).trim())
            : null;
        if (
          row.dateOfBirth != null &&
          String(row.dateOfBirth).trim() !== "" &&
          (dob == null || Number.isNaN(dob.getTime()))
        ) {
          errors.push({ row: rowIndex, message: "Некорректная дата рождения" });
          continue;
        }

        const statusId =
          row.status != null && String(row.status).trim() !== ""
            ? statusByLabel.get(String(row.status).trim()) ?? defaultStatusId
            : defaultStatusId;

        let client: { id: string } | null = null;

        const customFields = row.customFields ?? {};

        async function upsertCustomFieldsForClient(clientId: string) {
          for (const [label, rawValue] of Object.entries(customFields)) {
            const def = defByLabel.get(label);
            if (!def || rawValue === undefined || rawValue === null || rawValue === "") continue;

            const { value, warning } = labelToValue(def, rawValue);
            if (value === null) {
              if (warning) {
                warnings.push({ row: rowIndex, message: `Поле «${label}»: ${warning}` });
              }
              continue;
            }
            if (warning) {
              warnings.push({ row: rowIndex, message: `Поле «${label}»: ${warning}` });
            }

            const existingVal = await prisma.customFieldValue.findFirst({
              where: { clientId, definitionId: def.id }
            });
            if (existingVal) {
              await prisma.customFieldValue.update({
                where: { id: existingVal.id },
                data: { value: value as object }
              });
            } else {
              await prisma.customFieldValue.create({
                data: {
                  definitionId: def.id,
                  clientId,
                  value: value as object
                }
              });
            }
          }
        }

        // 1) Обновление по ID, если передан и принадлежит текущему психологу
        if (row.id) {
          const existingById = await prisma.clientProfile.findFirst({
            where: { id: row.id, psychologistId: profile.id }
          });
          if (existingById) {
            await prisma.clientProfile.update({
              where: { id: existingById.id },
              data: {
                firstName: row.firstName.trim(),
                lastName: row.lastName.trim(),
                dateOfBirth: dob ?? undefined,
                phone: row.phone != null ? String(row.phone).trim() || null : null,
                country: row.country != null ? String(row.country).trim() || null : null,
                city: row.city != null ? String(row.city).trim() || null : null,
                gender: row.gender != null ? String(row.gender).trim() || null : null,
                maritalStatus:
                  row.maritalStatus != null ? String(row.maritalStatus).trim() || null : null,
                notes: row.notes != null ? String(row.notes).trim() || null : null,
                statusId: statusId ?? undefined
              }
            });
            client = { id: existingById.id };
            updated++;
            await upsertCustomFieldsForClient(client.id);
            continue;
          }
        }

        // 2) Обновление по email, если включён skipDuplicatesByEmail
        if (skipDuplicates && emailRaw) {
          const existing = await prisma.clientProfile.findFirst({
            where: { psychologistId: profile.id, email: emailRaw }
          });
          if (existing) {
            await prisma.clientProfile.update({
              where: { id: existing.id },
              data: {
                firstName: row.firstName.trim(),
                lastName: row.lastName.trim(),
                dateOfBirth: dob ?? undefined,
                phone: row.phone != null ? String(row.phone).trim() || null : null,
                country: row.country != null ? String(row.country).trim() || null : null,
                city: row.city != null ? String(row.city).trim() || null : null,
                gender: row.gender != null ? String(row.gender).trim() || null : null,
                maritalStatus:
                  row.maritalStatus != null ? String(row.maritalStatus).trim() || null : null,
                notes: row.notes != null ? String(row.notes).trim() || null : null,
                statusId: statusId ?? undefined
              }
            });
            client = { id: existing.id };
            updated++;
            await upsertCustomFieldsForClient(client.id);
            continue;
          }
        }

        // 3) Иначе — создаём нового клиента
        client = await prisma.clientProfile.create({
          data: {
            psychologistId: profile.id,
            email: emailRaw ?? undefined,
            firstName: row.firstName.trim(),
            lastName: row.lastName.trim(),
            dateOfBirth: dob ?? undefined,
            phone: row.phone != null ? String(row.phone).trim() || null : null,
            country: row.country != null ? String(row.country).trim() || null : null,
            city: row.city != null ? String(row.city).trim() || null : null,
            gender: row.gender != null ? String(row.gender).trim() || null : null,
            maritalStatus:
              row.maritalStatus != null ? String(row.maritalStatus).trim() || null : null,
            notes: row.notes != null ? String(row.notes).trim() || null : null,
            statusId: statusId ?? undefined
          }
        });
        created++;
        await upsertCustomFieldsForClient(client.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Ошибка создания";
        errors.push({ row: rowIndex, message });
      }
    }

    await safeLogAudit({
      action: "CLIENTS_IMPORT",
      actorUserId: ctx.userId,
      actorRole: ctx.user.role ?? "PSYCHOLOGIST",
      targetType: "PsychologistProfile",
      targetId: profile.id,
      ip,
      meta: {
        importedRows: body.clients.length,
        created,
        updated,
        skipped,
        failed: errors.length
      }
    });

    return NextResponse.json({
      created,
      updated,
      skipped,
      failed: errors.length,
      errors,
      warnings
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      logZodError("POST /api/psychologist/clients/import", err);
      return NextResponse.json(
        { message: "Ошибка валидации", issues: err.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/psychologist/clients/import] Внутренняя ошибка сервера:", err);
    if (err instanceof Error && err.stack) {
      console.error("[POST /api/psychologist/clients/import] Stack:", err.stack);
    }
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
