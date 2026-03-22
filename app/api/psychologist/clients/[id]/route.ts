import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { logZodError } from "@/lib/log-validation-error";
import { safeLogAudit } from "@/lib/audit-log";
import { getClientIp, requirePsychologist } from "@/lib/security/api-guards";

type ParamsPromise = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
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
  const { id } = await params;
  const ctx = await requirePsychologist();
  if (!ctx.ok) return ctx.response;

  const client = await prisma.clientProfile.findFirst({
    where: {
      id,
      psychologistId: ctx.psychologistId
    },
    include: {
      user: {
        select: {
          email: true
        }
      },
      status: {
        select: { id: true, label: true, color: true }
      }
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
    notes: client.notes,
    createdAt: client.createdAt,
    email: client.user?.email ?? client.email ?? null,
    hasAccount: !!client.userId,
    statusId: client.status?.id ?? null,
    statusLabel: client.status?.label ?? null,
    statusColor: client.status?.color ?? null
  });
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
      notes: data.notes !== undefined ? data.notes : existing.notes
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

    const updated = await prisma.clientProfile.update({
      where: { id: existing.id },
      data: updateData
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logZodError("PATCH /api/psychologist/clients/[id]", error);
      return NextResponse.json(
        { message: "Ошибка валидации", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Update client error", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { message: message ? `Внутренняя ошибка сервера: ${message}` : "Внутренняя ошибка сервера" },
      { status: 500 }
    );
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

