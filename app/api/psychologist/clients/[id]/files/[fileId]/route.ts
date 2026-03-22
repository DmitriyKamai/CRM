import { NextResponse } from "next/server";

import { safeLogAudit } from "@/lib/audit-log";
import { ClientHistoryType, safeLogClientHistory } from "@/lib/client-history";
import { prisma } from "@/lib/db";
import { getClientIp, requirePsychologist } from "@/lib/security/api-guards";

type ParamsPromise = {
  params: Promise<{ id: string; fileId: string }>;
};

export async function DELETE(req: Request, { params }: ParamsPromise) {
  try {
    const { id, fileId } = await params;
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;

    const result = await prisma.clientFile.deleteMany({
      where: {
        id: fileId,
        clientId: id,
        psychologistId: ctx.psychologistId
      }
    });

    if (result.count > 0) {
      await safeLogAudit({
        action: "CLIENT_FILE_DELETE",
        actorUserId: ctx.userId,
        actorRole: ctx.user.role ?? "PSYCHOLOGIST",
        targetType: "ClientFile",
        targetId: fileId,
        ip: getClientIp(req),
        meta: { clientId: id }
      });
      await safeLogClientHistory({
        clientId: id,
        type: ClientHistoryType.FILE_DELETED,
        actorUserId: ctx.userId,
        meta: { fileId }
      });
    }

    // Физическое удаление из Blob Storage пока не трогаем — URL станет недоступен после очистки.
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/psychologist/clients/[id]/files/[fileId]]", error);
    return NextResponse.json(
      { message: "Не удалось удалить файл" },
      { status: 500 }
    );
  }
}

