import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { logZodError } from "@/lib/log-validation-error";
import { safeLogAudit } from "@/lib/audit-log";
import { ClientHistoryType, safeLogClientHistory } from "@/lib/client-history";
import {
  formatDobHistory,
  formatGenderHistory,
  formatMaritalHistory,
  profileFieldLabel
} from "@/lib/client-profile-display";
import { getClientIp, requirePsychologist } from "@/lib/security/api-guards";
import {
  decryptClientNotesFromDb,
  encryptClientNotesForDb
} from "@/lib/server-encryption/client-profile-storage";

type ParamsPromise = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function sameDate(a: Date | null, b: Date | null) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return a.getTime() === b.getTime();
}

function str(v: string | null | undefined) {
  return v ?? "";
}

const updateClientSchema = z.object({
  firstName: z.string().min(1, "Укажите имя").optional(),
  lastName: z.string().min(1, "Укажите фамилию").optional(),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  maritalStatus: z.string().optional().nullable(),
  notes: z.string().optional(),
  statusId: z.string().nullable().optional(),
  email: z.string().email("Некорректный email").optional().or(z.literal(""))
});

export async function GET(_req: Request, { params }: ParamsPromise) {
  try {
    const { id } = await params;
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;

    const client = await prisma.clientProfile.findFirst({
      where: {
        id,
        psychologistId: ctx.psychologistId
      },
      include: {
        user: { select: { email: true } },
        status: { select: { id: true, label: true, color: true } }
      }
    });

    if (!client) {
      return NextResponse.json({ message: "Клиент не найден" }, { status: 404 });
    }

    return NextResponse.json({
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      dateOfBirth: client.dateOfBirth,
      phone: client.phone,
      country: client.country,
      city: client.city,
      gender: client.gender,
      maritalStatus: client.maritalStatus,
      notes: decryptClientNotesFromDb(client.notes),
      createdAt: client.createdAt,
      email: client.user?.email ?? client.email ?? null,
      hasAccount: !!client.userId,
      statusId: client.status?.id ?? null,
      statusLabel: client.status?.label ?? null,
      statusColor: client.status?.color ?? null
    });
  } catch (error) {
    console.error("[GET /api/psychologist/clients/[id]]", error);
    return NextResponse.json({ message: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: ParamsPromise) {
  try {
    const { id } = await params;
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;

    const json = await request.json().catch(() => null);
    const data = updateClientSchema.parse(json ?? {});

    const existing = await prisma.clientProfile.findFirst({
      where: { id, psychologistId: ctx.psychologistId }
    });

    if (!existing) {
      return NextResponse.json({ message: "Клиент не найден" }, { status: 404 });
    }

    const dob =
      data.dateOfBirth !== undefined
        ? data.dateOfBirth && data.dateOfBirth.trim().length > 0
          ? new Date(data.dateOfBirth)
          : null
        : existing.dateOfBirth;

    const updateData: {
      firstName?: string;
      lastName?: string;
      dateOfBirth?: Date | null;
      phone?: string | null;
      country?: string | null;
      city?: string | null;
      gender?: string | null;
      maritalStatus?: string | null;
      notes?: string | null;
      email?: string | null;
      statusId?: string | null;
    } = {
      firstName: data.firstName ?? existing.firstName,
      lastName: data.lastName ?? existing.lastName,
      dateOfBirth: dob,
      phone: data.phone !== undefined ? data.phone : existing.phone,
      country: data.country !== undefined ? data.country : existing.country,
      city: data.city !== undefined ? data.city : existing.city,
      gender: data.gender !== undefined ? data.gender : existing.gender,
      maritalStatus: data.maritalStatus !== undefined ? data.maritalStatus : existing.maritalStatus,
      notes:
        data.notes !== undefined
          ? encryptClientNotesForDb(data.notes.trim() === "" ? null : data.notes)
          : existing.notes
    };

    // Email редактируем только если у клиента ещё нет аккаунта
    if (existing.userId == null && data.email !== undefined) {
      const emailRaw = typeof data.email === "string" ? data.email.trim() : "";
      if (emailRaw) {
        const email = normalizeEmail(emailRaw);
        const duplicate = await prisma.clientProfile.findFirst({
          where: {
            psychologistId: ctx.psychologistId,
            email,
            id: { not: existing.id }
          }
        });
        if (duplicate) {
          return NextResponse.json(
            { message: "Клиент с таким email уже есть в вашем списке" },
            { status: 400 }
          );
        }
        updateData.email = email;
      } else {
        updateData.email = null;
      }
    }

    if (data.statusId !== undefined) {
      updateData.statusId = data.statusId;
    }

    const nextStatusId = data.statusId !== undefined ? data.statusId : existing.statusId;

    const profileChanges: { field: string; from: string; to: string }[] = [];

    if (updateData.firstName !== undefined && updateData.firstName !== existing.firstName) {
      profileChanges.push({
        field: "firstName",
        from: existing.firstName,
        to: updateData.firstName
      });
    }
    if (updateData.lastName !== undefined && updateData.lastName !== existing.lastName) {
      profileChanges.push({
        field: "lastName",
        from: existing.lastName,
        to: updateData.lastName
      });
    }
    if (updateData.dateOfBirth !== undefined && !sameDate(updateData.dateOfBirth, existing.dateOfBirth)) {
      profileChanges.push({
        field: "dateOfBirth",
        from: formatDobHistory(existing.dateOfBirth),
        to: formatDobHistory(updateData.dateOfBirth)
      });
    }
    if (updateData.phone !== undefined && str(existing.phone) !== str(updateData.phone)) {
      profileChanges.push({
        field: "phone",
        from: existing.phone || "—",
        to: updateData.phone || "—"
      });
    }
    if (updateData.country !== undefined && str(existing.country) !== str(updateData.country)) {
      profileChanges.push({
        field: "country",
        from: existing.country || "—",
        to: updateData.country || "—"
      });
    }
    if (updateData.city !== undefined && str(existing.city) !== str(updateData.city)) {
      profileChanges.push({
        field: "city",
        from: existing.city || "—",
        to: updateData.city || "—"
      });
    }
    if (updateData.gender !== undefined && str(existing.gender) !== str(updateData.gender)) {
      profileChanges.push({
        field: "gender",
        from: formatGenderHistory(existing.gender),
        to: formatGenderHistory(updateData.gender)
      });
    }
    if (updateData.maritalStatus !== undefined && str(existing.maritalStatus) !== str(updateData.maritalStatus)) {
      profileChanges.push({
        field: "maritalStatus",
        from: formatMaritalHistory(existing.maritalStatus),
        to: formatMaritalHistory(updateData.maritalStatus)
      });
    }
    if (data.notes !== undefined) {
      const fromPlain = decryptClientNotesFromDb(existing.notes) ?? "";
      const toPlain = data.notes.trim() === "" ? "" : data.notes;
      if (fromPlain !== toPlain) {
        profileChanges.push({
          field: "notes",
          from: fromPlain || "—",
          to: toPlain || "—"
        });
      }
    }
    if (
      existing.userId == null &&
      data.email !== undefined &&
      updateData.email !== undefined &&
      str(existing.email) !== str(updateData.email)
    ) {
      profileChanges.push({
        field: "email",
        from: existing.email || "—",
        to: updateData.email || "—"
      });
    }

    const statusChanged =
      data.statusId !== undefined &&
      (existing.statusId ?? null) !== (nextStatusId ?? null);

    const updated = await prisma.clientProfile.update({
      where: { id: existing.id },
      data: updateData
    });

    if (profileChanges.length > 0) {
      await safeLogClientHistory({
        clientId: existing.id,
        type: ClientHistoryType.PROFILE_UPDATED,
        actorUserId: ctx.userId,
        meta: {
          changes: profileChanges.map((c) => ({
            ...c,
            label: profileFieldLabel(c.field)
          }))
        }
      });
    }

    if (statusChanged) {
      const ids = [existing.statusId, nextStatusId].filter((x): x is string => !!x);
      const statusRows =
        ids.length > 0
          ? await prisma.clientStatus.findMany({
              where: { id: { in: ids } },
              select: { id: true, label: true }
            })
          : [];
      const labelById = new Map(statusRows.map((s) => [s.id, s.label]));
      await safeLogClientHistory({
        clientId: existing.id,
        type: ClientHistoryType.STATUS_CHANGED,
        actorUserId: ctx.userId,
        meta: {
          fromId: existing.statusId,
          toId: nextStatusId,
          fromLabel: existing.statusId ? labelById.get(existing.statusId) ?? "—" : "Без статуса",
          toLabel: nextStatusId ? labelById.get(nextStatusId) ?? "—" : "Без статуса"
        }
      });
    }

    return NextResponse.json({
      ...updated,
      notes: decryptClientNotesFromDb(updated.notes)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logZodError("PATCH /api/psychologist/clients/[id]", error);
      return NextResponse.json(
        { message: "Ошибка валидации", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Update client error", error);
    return NextResponse.json({ message: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: ParamsPromise) {
  try {
    const { id } = await params;
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;

    const existing = await prisma.clientProfile.findFirst({
      where: { id, psychologistId: ctx.psychologistId }
    });

    if (!existing) {
      return NextResponse.json({ message: "Клиент не найден" }, { status: 404 });
    }

    await safeLogClientHistory({
      clientId: existing.id,
      type: ClientHistoryType.REMOVED_FROM_LIST,
      actorUserId: ctx.userId,
      meta: { mode: "detach_from_psychologist" }
    });

    await prisma.clientProfile.update({
      where: { id: existing.id },
      data: { psychologistId: null }
    });

    await safeLogAudit({
      action: "CLIENT_DELETE",
      actorUserId: ctx.userId,
      actorRole: ctx.user.role ?? "PSYCHOLOGIST",
      targetType: "ClientProfile",
      targetId: existing.id,
      ip: getClientIp(request),
      meta: { mode: "detach_from_psychologist" }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete client error", error);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

