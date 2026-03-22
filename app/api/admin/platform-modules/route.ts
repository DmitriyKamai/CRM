import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { PLATFORM_SETTINGS_ID } from "@/lib/platform-modules";
import { requireAdmin } from "@/lib/security/api-guards";

const patchSchema = z.object({
  schedulingEnabled: z.boolean().optional(),
  diagnosticsEnabled: z.boolean().optional()
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const row = await prisma.platformSettings.findUnique({
    where: { id: PLATFORM_SETTINGS_ID },
    select: { schedulingEnabled: true, diagnosticsEnabled: true }
  });

  return NextResponse.json({
    schedulingEnabled: row?.schedulingEnabled ?? true,
    diagnosticsEnabled: row?.diagnosticsEnabled ?? true
  });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json ?? {});
  if (!parsed.success) {
    return NextResponse.json({ message: "Некорректное тело запроса" }, { status: 400 });
  }

  const { schedulingEnabled, diagnosticsEnabled } = parsed.data;
  if (schedulingEnabled === undefined && diagnosticsEnabled === undefined) {
    return NextResponse.json({ message: "Нет полей для обновления" }, { status: 400 });
  }

  const existing = await prisma.platformSettings.findUnique({
    where: { id: PLATFORM_SETTINGS_ID },
    select: { schedulingEnabled: true, diagnosticsEnabled: true }
  });

  const nextScheduling = schedulingEnabled ?? existing?.schedulingEnabled ?? true;
  const nextDiagnostics = diagnosticsEnabled ?? existing?.diagnosticsEnabled ?? true;

  await prisma.platformSettings.upsert({
    where: { id: PLATFORM_SETTINGS_ID },
    create: {
      id: PLATFORM_SETTINGS_ID,
      schedulingEnabled: nextScheduling,
      diagnosticsEnabled: nextDiagnostics
    },
    update: {
      ...(schedulingEnabled !== undefined && { schedulingEnabled }),
      ...(diagnosticsEnabled !== undefined && { diagnosticsEnabled })
    }
  });

  revalidatePath("/", "layout");
  revalidatePath("/psychologist");
  revalidatePath("/client");
  revalidatePath("/admin");

  return NextResponse.json({
    schedulingEnabled: nextScheduling,
    diagnosticsEnabled: nextDiagnostics
  });
}
