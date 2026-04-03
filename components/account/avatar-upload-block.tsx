"use client";

import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ImageCropDialog } from "@/components/account/image-crop-dialog";
import { toast } from "sonner";

type Props = {
  image: string | null;
  initials: string;
  alt: string;
  onSuccess?: () => void;
};

export function AvatarUploadBlock({ image, initials, alt, onSuccess }: Props) {
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
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: form
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Не удалось загрузить фото");
        return;
      }
      toast.success("Аватар обновлён");
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
      const res = await fetch("/api/user/avatar", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message ?? "Не удалось удалить аватар");
        return;
      }
      toast.success("Аватар удалён");
      onSuccess?.();
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar className="h-16 w-16 shrink-0">
        <AvatarImage src={image ?? undefined} alt={alt} />
        <AvatarFallback className="bg-muted text-lg">
          {initials.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
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
          {image && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={removing}
              onClick={handleRemove}
              className="text-muted-foreground"
            >
              {removing ? "Удаление…" : "Удалить аватар"}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          JPEG, PNG, WebP или GIF, не более 2 МБ. После выбора — круглое кадрирование, сохранение 512×512
          px. Или аватар из Google/Apple в разделе «Аккаунты».
        </p>
      </div>

      <ImageCropDialog
        open={cropOpen}
        onOpenChange={(open) => {
          setCropOpen(open);
          if (!open) setPendingFile(null);
        }}
        file={pendingFile}
        aspect={1}
        cropPreviewShape="round"
        circularExport
        title="Обрежьте аватар"
        onCroppedFile={(f) => uploadCroppedFile(f)}
      />
    </div>
  );
}
