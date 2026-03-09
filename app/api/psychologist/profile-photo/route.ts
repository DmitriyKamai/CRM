import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Загрузить фото профиля психолога (для карточки в «Записаться к психологу»). Сохраняет URL в PsychologistProfile.profilePhotoUrl. */
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

    const profile = await prisma.psychologistProfile.findUnique({
      where: { userId },
      select: { id: true }
    });
    if (!profile) {
      return NextResponse.json({ message: "Профиль психолога не найден" }, { status: 403 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { message: "Загрузка фото не настроена (BLOB_READ_WRITE_TOKEN)." },
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
    const pathname = `profile-photos/${profile.id}-${Date.now()}.${ext}`;

    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: false
    });

    await prisma.psychologistProfile.update({
      where: { id: profile.id },
      data: { profilePhotoUrl: blob.url }
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[POST /api/psychologist/profile-photo]", err);
    return NextResponse.json(
      { message: "Не удалось загрузить фото профиля" },
      { status: 500 }
    );
  }
}

/** Удалить фото профиля (PsychologistProfile.profilePhotoUrl = null). */
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

    await prisma.psychologistProfile.updateMany({
      where: { userId },
      data: { profilePhotoUrl: null }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/psychologist/profile-photo]", err);
    return NextResponse.json(
      { message: "Не удалось удалить фото профиля" },
      { status: 500 }
    );
  }
}
