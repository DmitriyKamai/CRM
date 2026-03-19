import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

import { prisma } from "@/lib/db";
import { requirePsychologist } from "@/lib/security/api-guards";

type ParamsPromise = {
  params: Promise<{ id: string }>;
};

// Ограничения как в типичных CRM, но жёстче:
// до 5 МБ на файл, до 10 файлов на клиента, только текстовые документы и изображения.
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_FILES_PER_CLIENT = 10;
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

export async function GET(_req: Request, { params }: ParamsPromise) {
  const { id } = await params;
  const ctx = await requirePsychologist();
  if (!ctx.ok) return ctx.response;

  const files = await prisma.clientFile.findMany({
    where: { psychologistId: ctx.psychologistId, clientId: id },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ files });
}

export async function POST(request: Request, { params }: ParamsPromise) {
  try {
    const { id } = await params;
    const ctx = await requirePsychologist();
    if (!ctx.ok) return ctx.response;

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { message: "Загрузка файлов не настроена (BLOB_READ_WRITE_TOKEN)." },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { message: "Отправьте файл в поле file" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          message:
            "Допустимы только изображения (JPEG, PNG, WebP, GIF) и текстовые документы (TXT, PDF, DOC, DOCX)"
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { message: "Размер файла не более 5 МБ" },
        { status: 400 }
      );
    }

    const existingCount = await prisma.clientFile.count({
      where: { psychologistId: ctx.psychologistId, clientId: id }
    });
    if (existingCount >= MAX_FILES_PER_CLIENT) {
      return NextResponse.json(
        { message: "Можно прикрепить не более 10 файлов к профилю клиента" },
        { status: 400 }
      );
    }

    const safeName = file.name || "file";
    const ext = safeName.includes(".") ? safeName.split(".").pop() : "bin";
    const pathname = `client-files/${ctx.psychologistId}/${id}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const blob = await put(pathname, file, {
      access: "private",
      addRandomSuffix: false
    });

    const created = await prisma.clientFile.create({
      data: {
        psychologistId: ctx.psychologistId,
        clientId: id,
        url: blob.url,
        filename: safeName,
        mimeType: file.type || "application/octet-stream",
        size: file.size
      }
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[POST /api/psychologist/clients/[id]/files]", error);
    return NextResponse.json(
      { message: "Не удалось загрузить файл" },
      { status: 500 }
    );
  }
}

