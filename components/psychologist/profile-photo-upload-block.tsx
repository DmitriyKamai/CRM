"use client";

import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ImageCropDialog } from "@/components/account/image-crop-dialog";
import { toast } from "sonner";

type Props = {
  profilePhotoUrl: string | null;
  initials: string;
  alt: string;
  onSuccess?: () => void;
};

export function ProfilePhotoUploadBlock({
  profilePhotoUrl,
  initials,
  alt,
  onSuccess
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const uploadCroppedFile = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/psychologist/profile-photo", {
        method: "POST",
        body: form
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Не удалось загрузить фото");
        return;
      }
      toast.success("Фото профиля обновлено");
      onSuccess?.();
    } finally {
      setUploading(false);
    }
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setPendingFile(file);
    setCropOpen(true);
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await fetch("/api/psychologist/profile-photo", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message ?? "Не удалось удалить фото");
        return;
      }
      toast.success("Фото профиля удалено");
      onSuccess?.();
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-4">
        <div className="w-full max-w-[280px] aspect-square relative bg-muted overflow-hidden rounded-t-lg rounded-b-lg shrink-0">
          <Avatar className="absolute inset-0 h-full w-full rounded-none rounded-lg">
            <AvatarImage
              src={profilePhotoUrl ?? undefined}
              alt={alt}
              className="rounded-lg object-cover"
            />
            <AvatarFallback className="rounded-lg bg-muted text-4xl font-medium text-muted-foreground">
              {initials.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFilePick}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? "Загрузка…" : "Загрузить фото"}
            </Button>
            {profilePhotoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={removing}
                onClick={handleRemove}
                className="text-muted-foreground"
              >
                {removing ? "Удаление…" : "Удалить фото"}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Фото для публичной карточки. JPEG, PNG, WebP или GIF, до 2 МБ. После
            выбора — кадрирование, сохранение 512×512 px.
          </p>
        </div>
      </div>

      <ImageCropDialog
        open={cropOpen}
        onOpenChange={(open) => {
          setCropOpen(open);
          if (!open) setPendingFile(null);
        }}
        file={pendingFile}
        aspect={1}
        title="Обрежьте фото профиля"
        description="Выберите область для квадратной карточки 512×512 px. Настройте масштаб и рамку."
        onCroppedFile={(f) => uploadCroppedFile(f)}
      />
    </div>
  );
}
