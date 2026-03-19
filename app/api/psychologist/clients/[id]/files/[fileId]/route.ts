import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requirePsychologist } from "@/lib/security/api-guards";

type ParamsPromise = {
  params: Promise<{ id: string; fileId: string }>;
};

export async function DELETE(_req: Request, { params }: ParamsPromise) {
  try {
    const { id, fileId } = await params;
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;

    await prisma.clientFile.deleteMany({
      where: {
        id: fileId,
        clientId: id,
        psychologistId: ctx.psychologistId
      }
    });

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

