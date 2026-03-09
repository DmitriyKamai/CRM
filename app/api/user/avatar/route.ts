import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Загрузить аватар: multipart/form-data с полем "file". Сохраняет URL в User.image. */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Не авторизован" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ message: "Сессия недействительна" }, { status: 401 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { message: "Загрузка аватаров не настроена (BLOB_READ_WRITE_TOKEN). Добавьте Vercel Blob в проект." },
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

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { message: "Допустимы только изображения: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { message: "Размер файла не более 2 МБ" },
        { status: 400 }
      );
    }

    const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "gif";
    const pathname = `avatars/${userId}-${Date.now()}.${ext}`;

    let blob;
    try {
      blob = await put(pathname, file, {
        access: "public",
        addRandomSuffix: false
      });
    } catch (blobErr) {
      const msg = blobErr instanceof Error ? blobErr.message : String(blobErr);
      console.error("[POST /api/user/avatar] Blob upload failed:", msg);
      const isAuth = /unauthorized|token|forbidden|401|403/i.test(msg);
      return NextResponse.json(
        {
          message: isAuth
            ? "Ошибка доступа к хранилищу. Проверьте BLOB_READ_WRITE_TOKEN в настройках проекта."
            : "Не удалось загрузить файл в хранилище. Попробуйте позже."
        },
        { status: 503 }
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { image: blob.url }
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[POST /api/user/avatar]", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        message:
          process.env.NODE_ENV === "development"
            ? `Ошибка: ${message}`
            : "Не удалось загрузить аватар"
      },
      { status: 500 }
    );
  }
}

/** Удалить свой аватар (вернуть User.image в null). */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Не авторизован" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ message: "Сессия недействительна" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { image: null }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/user/avatar]", err);
    return NextResponse.json(
      { message: "Не удалось удалить аватар" },
      { status: 500 }
    );
  }
}
