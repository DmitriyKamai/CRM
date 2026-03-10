"use client";

import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type Props = {
  profilePhotoUrl: string | null;
  profilePublished: boolean;
  initials: string;
  alt: string;
  onSuccess?: () => void;
  onPublishChange?: (published: boolean) => void;
  publishSaving?: boolean;
};

export function ProfilePhotoUploadBlock({
  profilePhotoUrl,
  profilePublished,
  initials,
  alt,
  onSuccess,
  onPublishChange,
  publishSaving
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

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

  const handlePublishChange = async (checked: boolean) => {
    if (publishSaving || onPublishChange === undefined) return;
    onPublishChange(checked);
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
              onChange={handleFile}
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
            Фото для карточки в разделе «Записаться к психологу». JPEG, PNG, WebP или GIF, не более 2 МБ.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border/80 p-4">
        <div className="space-y-0.5">
          <Label htmlFor="profile-published" className="text-base cursor-pointer">
            Опубликовать профиль
          </Label>
          <p className="text-xs text-muted-foreground">
            Только при включённой опции клиенты увидят ваш профиль в разделе «Записаться к психологу».
          </p>
        </div>
        <Switch
          id="profile-published"
          checked={profilePublished}
          onCheckedChange={handlePublishChange}
          disabled={publishSaving}
          className="cursor-pointer disabled:cursor-pointer"
        />
      </div>
    </div>
  );
}
