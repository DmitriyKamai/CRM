import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

type ParamsPromise = {
  params: Promise<{ id: string; fileId: string }>;
};

export async function DELETE(_req: Request, { params }: ParamsPromise) {
  try {
    const { id, fileId } = await params;
    const session = await getServerSession(authOptions);
    const role = (session?.user as unknown as { role?: string | null } | null)?.role;
    if (!session?.user || role !== "PSYCHOLOGIST") {
      return NextResponse.json({ message: "Доступ запрещён" }, { status: 403 });
    }
    const userId = (session.user as unknown as { id?: string | null }).id;
    if (!userId) {
      return NextResponse.json({ message: "Сессия недействительна" }, { status: 401 });
    }

    const psych = await prisma.psychologistProfile.findUnique({
      where: { userId },
      select: { id: true }
    });
    if (!psych) {
      return NextResponse.json(
        { message: "Профиль психолога не найден" },
        { status: 400 }
      );
    }

    await prisma.clientFile.deleteMany({
      where: {
        id: fileId,
        clientId: id,
        psychologistId: psych.id
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

