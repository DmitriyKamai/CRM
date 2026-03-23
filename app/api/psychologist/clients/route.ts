import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { logZodError } from "@/lib/log-validation-error";
import { ClientHistoryType, safeLogClientHistory } from "@/lib/client-history";
import { requirePsychologist, requireRoles } from "@/lib/security/api-guards";
import { withPrismaLock } from "@/lib/prisma-request-lock";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

const createClientSchema = z.object({
  email: z.string().email("Некорректный email").optional().or(z.literal("")),
  firstName: z.string().min(1, "Укажите имя"),
  lastName: z.string().min(1, "Укажите фамилию"),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  maritalStatus: z.string().optional().nullable(),
  notes: z.string().optional(),
  statusId: z.string().optional().nullable()
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1)
});

export async function GET() {
  try {
    return await withPrismaLock(async () => {
      const auth = await requireRoles(["PSYCHOLOGIST"]);
      if (!auth.ok) return auth.response;
      const profile = await prisma.psychologistProfile.findUnique({
        where: { userId: auth.userId },
        select: { id: true }
      });

      if (!profile) {
        return NextResponse.json({ clients: [] });
      }

      const selectBase = {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        phone: true,
        notes: true,
        createdAt: true,
        userId: true,
        email: true,
        user: { select: { email: true, image: true } },
        status: { select: { id: true, label: true, color: true } }
      } as const;

      type ClientRow = {
        id: string;
        firstName: string;
        lastName: string;
        dateOfBirth: Date | null;
        phone: string | null;
        notes: string | null;
        createdAt: Date;
        userId: string | null;
        email: string | null;
        user: { email: string; image: string | null } | null;
        status?: { id: string; label: string; color: string } | null;
        country?: string | null;
        city?: string | null;
        gender?: string | null;
        maritalStatus?: string | null;
      };

      const clients = (await prisma.clientProfile.findMany({
        where: { psychologistId: profile.id },
        orderBy: { createdAt: "desc" },
        select: {
          ...selectBase,
          country: true,
          city: true,
          gender: true,
          maritalStatus: true
        }
      })) as ClientRow[];

      const clientIds = clients.map((c) => c.id);
      const customDefs = await prisma.customFieldDefinition.findMany({
        where: { psychologistId: profile.id, target: "CLIENT" },
        select: { id: true, label: true }
      });
      const defIds = customDefs.map((d) => d.id);
      const defIdToLabel = new Map(customDefs.map((d) => [d.id, d.label]));
      const customValuesRaw =
        defIds.length > 0 && clientIds.length > 0
          ? await prisma.customFieldValue.findMany({
              where: {
                clientId: { in: clientIds },
                definitionId: { in: defIds }
              },
              select: { clientId: true, definitionId: true, value: true }
            })
          : [];
      const customValues = customValuesRaw
        .filter((v) => v.clientId != null)
        .map((v) => ({ clientId: v.clientId!, definitionId: v.definitionId, value: v.value }));
      const customByClient = new Map<string, Record<string, unknown>>();
      for (const v of customValues) {
        let row = customByClient.get(v.clientId);
        if (!row) {
          row = {};
          customByClient.set(v.clientId, row);
        }
        const label = defIdToLabel.get(v.definitionId);
        if (label != null) row[label] = v.value as unknown;
      }

      return NextResponse.json({
        clients: clients.map(c => {
          const customFields = customByClient.get(c.id) ?? null;
          return {
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
            dateOfBirth: c.dateOfBirth,
            phone: c.phone,
            country: c.country ?? null,
            city: c.city ?? null,
            gender: c.gender ?? null,
            maritalStatus: c.maritalStatus ?? null,
            notes: c.notes,
            createdAt: c.createdAt,
            email: c.user?.email ?? c.email ?? null,
            hasAccount: !!c.userId,
            avatarUrl: c.user?.image ?? null,
            statusId: c.status?.id ?? null,
            statusLabel: c.status?.label ?? null,
            statusColor: c.status?.color ?? null,
            ...(customFields && Object.keys(customFields).length > 0 ? { customFields } : {})
          };
        })
      });
    });
  } catch (err) {
    console.error("[GET /api/psychologist/clients]", err);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;
    const psych = { id: ctx.psychologistId };

    async function getDefaultStatusId(psychologistId: string): Promise<string | null> {
      // Пытаемся найти статус с ключом NEW
      const existingNew = await prisma.clientStatus.findFirst({
        where: { psychologistId, key: "NEW" }
      });
      if (existingNew) return existingNew.id;

      // Если уже есть какие-то статусы — берём первый по порядку
      const anyExisting = await prisma.clientStatus.findFirst({
        where: { psychologistId },
        orderBy: { order: "asc" }
      });
      if (anyExisting) return anyExisting.id;

      // Иначе создаём дефолтный набор статусов, такой же, как при первом GET /client-statuses
      const defaults = [
        { key: "NEW", label: "Новый", color: "hsl(217 91% 60%)" },
        { key: "ACTIVE", label: "Активный", color: "hsl(142 76% 36%)" },
        { key: "PAUSED", label: "Пауза", color: "hsl(43 96% 56%)" },
        { key: "ARCHIVED", label: "Архив", color: "hsl(215 16% 47%)" }
      ];

      const created = await prisma.$transaction(
        defaults.map((s, index) =>
          prisma.clientStatus.create({
            data: {
              psychologistId,
              key: s.key,
              label: s.label,
              color: s.color,
              order: index
            }
          })
        )
      );
      const createdNew = created.find((s) => s.key === "NEW");
      return createdNew?.id ?? created[0]?.id ?? null;
    }

    const json = await request.json();
    const parsed = createClientSchema.parse(json);
    const emailRaw = typeof parsed.email === "string" ? parsed.email.trim() : "";
    const email = emailRaw ? normalizeEmail(emailRaw) : null;

    const dob =
      parsed.dateOfBirth && parsed.dateOfBirth.trim().length > 0
        ? new Date(parsed.dateOfBirth)
        : null;

    const defaultStatusId = await getDefaultStatusId(psych.id);
    const statusIdToUse = parsed.statusId ?? defaultStatusId ?? undefined;

    if (email) {
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (user && user.role !== "CLIENT") {
        return NextResponse.json(
          { message: "Пользователь с таким email уже существует и не является клиентом" },
          { status: 400 }
        );
      }

      if (user) {
        // Пользователь с таким email есть — создаём новый профиль у этого психолога (не переиспользуем чужой)
        const existingForPsych = await prisma.clientProfile.findFirst({
          where: { psychologistId: psych.id, userId: user.id }
        });
        if (existingForPsych) {
          return NextResponse.json(
            { message: "Клиент с таким email уже есть в вашем списке" },
            { status: 400 }
          );
        }
        const clientProfile = await prisma.clientProfile.create({
          data: {
            userId: user.id,
            psychologistId: psych.id,
            firstName: parsed.firstName,
            lastName: parsed.lastName,
            dateOfBirth: dob ?? undefined,
            phone: parsed.phone,
            country: parsed.country ?? undefined,
            city: parsed.city ?? undefined,
            gender: parsed.gender ?? undefined,
            maritalStatus: parsed.maritalStatus ?? undefined,
            notes: parsed.notes,
            statusId: statusIdToUse
          }
        });
        await safeLogClientHistory({
          clientId: clientProfile.id,
          type: ClientHistoryType.CLIENT_CREATED,
          actorUserId: ctx.userId,
          meta: { source: "manual" }
        });
        return NextResponse.json(clientProfile, { status: 201 });
      }

      // Нет пользователя — проверяем уникальность email у этого психолога
      const duplicate = await prisma.clientProfile.findFirst({
        where: { psychologistId: psych.id, email }
      });
      if (duplicate) {
        return NextResponse.json(
          { message: "Клиент с таким email уже есть в вашем списке" },
          { status: 400 }
        );
      }

      // Создаём только ClientProfile, User не создаём — связка при регистрации
      const clientProfile = await prisma.clientProfile.create({
        data: {
          psychologistId: psych.id,
          email,
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          dateOfBirth: dob ?? undefined,
          phone: parsed.phone,
          country: parsed.country ?? undefined,
          city: parsed.city ?? undefined,
          gender: parsed.gender ?? undefined,
          maritalStatus: parsed.maritalStatus ?? undefined,
          notes: parsed.notes,
          statusId: statusIdToUse
        }
      });
      await safeLogClientHistory({
        clientId: clientProfile.id,
        type: ClientHistoryType.CLIENT_CREATED,
        actorUserId: ctx.userId,
        meta: { source: "manual" }
      });
      return NextResponse.json(clientProfile, { status: 201 });
    }

    // Без email — только профиль у психолога
    const clientProfile = await prisma.clientProfile.create({
      data: {
        psychologistId: psych.id,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        dateOfBirth: dob ?? undefined,
        phone: parsed.phone,
        country: parsed.country ?? undefined,
        city: parsed.city ?? undefined,
        gender: parsed.gender ?? undefined,
        maritalStatus: parsed.maritalStatus ?? undefined,
        notes: parsed.notes,
        statusId: statusIdToUse
      }
    });
    await safeLogClientHistory({
      clientId: clientProfile.id,
      type: ClientHistoryType.CLIENT_CREATED,
      actorUserId: ctx.userId,
      meta: { source: "manual" }
    });
    return NextResponse.json(clientProfile, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logZodError("POST /api/psychologist/clients", error);
      return NextResponse.json(
        { message: "Ошибка валидации", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Create client error", error);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;
    const psych = { id: ctx.psychologistId };

    const json = await request.json().catch(() => null);
    const data = bulkDeleteSchema.parse(json ?? {});

    const toDetach = await prisma.clientProfile.findMany({
      where: {
        id: { in: data.ids },
        psychologistId: psych.id
      },
      select: { id: true }
    });

    for (const row of toDetach) {
      await safeLogClientHistory({
        clientId: row.id,
        type: ClientHistoryType.REMOVED_FROM_LIST,
        actorUserId: ctx.userId,
        meta: { mode: "bulk_detach" }
      });
    }

    const result = await prisma.clientProfile.updateMany({
      where: {
        id: { in: data.ids },
        psychologistId: psych.id
      },
      data: { psychologistId: null }
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logZodError("DELETE /api/psychologist/clients", error);
      return NextResponse.json(
        { message: "Ошибка валидации", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Bulk delete clients error", error);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

