import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { logZodError } from "@/lib/log-validation-error";
import { requirePsychologist, requireRoles } from "@/lib/security/api-guards";

const definitionSchema = z.object({
  id: z.string().optional(),
  group: z.string().trim().max(64).nullable().optional(),
  key: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(128),
  description: z.string().trim().max(512).nullable().optional(),
  type: z.enum([
    "TEXT",
    "NUMBER",
    "DATE",
    "SELECT",
    "MULTILINE",
    "BOOLEAN",
    "MULTI_SELECT"
  ]),
  order: z.number().int().min(0).optional(),
  options: z
    .object({
      required: z.boolean().optional(),
      booleanLabel: z.string().trim().max(128).optional(),
      selectOptions: z
        .array(
          z.object({
            value: z.string().trim().min(1).max(64),
            label: z.string().trim().min(1).max(128)
          })
        )
        .optional()
    })
    .nullable()
    .optional()
});

export async function GET() {
  const auth = await requireRoles(["PSYCHOLOGIST"]);
  if (!auth.ok) return auth.response;
  const profile = await prisma.psychologistProfile.findUnique({
    where: { userId: auth.userId },
    select: { id: true }
  });

  if (!profile) {
    return NextResponse.json({ items: [] });
  }

  const defs = await prisma.customFieldDefinition.findMany({
    where: { psychologistId: profile.id, target: "CLIENT" },
    orderBy: [{ group: "asc" }, { order: "asc" }, { createdAt: "asc" }]
  });

  return NextResponse.json({
    items: defs
  });
}

export async function POST(request: Request) {
  try {
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;
    const profile = { id: ctx.psychologistId };

    const body = await request.json().catch(() => ({}));
    const parsed = definitionSchema.parse(body);

    if (
      (parsed.type === "SELECT" || parsed.type === "MULTI_SELECT") &&
      (!parsed.options?.selectOptions || parsed.options.selectOptions.length === 0)
    ) {
      return NextResponse.json(
        { message: "Для поля «выбор из списка» укажите хотя бы один вариант" },
        { status: 400 }
      );
    }

    const orderBase =
      (await prisma.customFieldDefinition.count({
        where: {
          psychologistId: profile.id,
          target: "CLIENT",
          group: parsed.group ?? null
        }
      })) ?? 0;

    // Prisma Json field: pass a plain JSON-serializable object or undefined (not null)
    const optionsForDb =
      parsed.options != null
        ? (JSON.parse(JSON.stringify(parsed.options)) as Record<string, unknown>)
        : undefined;

    const created = await prisma.customFieldDefinition.create({
      data: {
        psychologistId: profile.id,
        target: "CLIENT",
        key: parsed.key,
        label: parsed.label,
        description: parsed.description ?? null,
        type: parsed.type,
        group: parsed.group ?? null,
        order: orderBase,
        options: optionsForDb as Prisma.InputJsonValue | undefined
      }
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logZodError("POST /api/psychologist/custom-fields", error);
      return NextResponse.json(
        { message: "Ошибка валидации", issues: error.issues },
        { status: 400 }
      );
    }
    const errMessage = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    console.error("[POST /api/psychologist/custom-fields]", errMessage, errStack);
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
    const profile = { id: ctx.psychologistId };

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ message: "Не указан id поля" }, { status: 400 });
    }

    const definition = await prisma.customFieldDefinition.findFirst({
      where: { id, psychologistId: profile.id, target: "CLIENT" },
      select: { id: true }
    });
    if (!definition) {
      return NextResponse.json(
        { message: "Поле не найдено или доступ запрещён" },
        { status: 404 }
      );
    }

    await prisma.$transaction([
      prisma.customFieldValue.deleteMany({ where: { definitionId: definition.id } }),
      prisma.customFieldDefinition.deleteMany({
        where: { id: definition.id, psychologistId: profile.id, target: "CLIENT" }
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/psychologist/custom-fields]", error);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;
    const profile = { id: ctx.psychologistId };

    const body = await request.json().catch(() => ({}));
    const partialSchema = definitionSchema
      .pick({
        id: true,
        group: true,
        label: true,
        description: true,
        order: true
      })
      .partial()
      .required({ id: true });
    const parsed = partialSchema.parse(body);

    const updateData: Record<string, unknown> = {
      label: parsed.label ?? undefined,
      description:
        parsed.description !== undefined ? parsed.description ?? null : undefined,
      group:
        parsed.group !== undefined
          ? parsed.group && parsed.group.trim().length > 0
            ? parsed.group.trim()
            : null
          : undefined
    };
    if (parsed.order !== undefined) {
      updateData.order = parsed.order;
    }
    const updated = await prisma.customFieldDefinition.updateMany({
      where: { id: parsed.id, psychologistId: profile.id, target: "CLIENT" },
      data: updateData
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { message: "Поле не найдено или доступ запрещён" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logZodError("PATCH /api/psychologist/custom-fields", error);
      return NextResponse.json(
        { message: "Ошибка валидации", issues: error.issues },
        { status: 400 }
      );
    }
    console.error("[PATCH /api/psychologist/custom-fields]", error);
    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

