"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { toast } from "sonner";

import { getCroppedImageBlob } from "@/lib/image-crop/canvas-crop";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

const DEFAULT_OUTPUT_OPTIONS = [
  { label: "400 px — компактно", value: 400 },
  { label: "512 px — стандарт", value: 512 },
  { label: "720 px — крупнее", value: 720 },
  { label: "1024 px — максимум", value: 1024 }
] as const;

export type ImageCropDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  /** Соотношение сторон рамки обрезки (1 = квадрат). */
  aspect: number;
  title: string;
  description?: string;
  outputSizeOptions?: readonly { label: string; value: number }[];
  defaultOutputSize?: number;
  onCroppedFile: (file: File) => void | Promise<void>;
};

export function ImageCropDialog({
  open,
  onOpenChange,
  file,
  aspect,
  title,
  description = "Перетащите фото, выберите область и при необходимости увеличьте масштаб.",
  outputSizeOptions = DEFAULT_OUTPUT_OPTIONS,
  defaultOutputSize = 512,
  onCroppedFile
}: ImageCropDialogProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [outputSize, setOutputSize] = useState(defaultOutputSize);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setOutputSize(defaultOutputSize);
    }
  }, [open, file, defaultOutputSize]);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleApply = async () => {
    if (!objectUrl || !croppedAreaPixels || !file) return;
    setApplying(true);
    try {
      const blob = await getCroppedImageBlob(objectUrl, croppedAreaPixels, outputSize);
      const base = file.name.replace(/\.[^.]+$/, "") || "photo";
      const outFile = new File([blob], `${base}.jpg`, { type: "image/jpeg" });
      await onCroppedFile(outFile);
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Не удалось обработать фото";
      toast.error(msg);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {objectUrl ? (
          <div className="space-y-4">
            <div className="relative h-[min(55vh,400px)] w-full overflow-hidden rounded-lg bg-muted">
              <Cropper
                image={objectUrl}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                showGrid
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Масштаб</Label>
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.05}
                onValueChange={(v) => setZoom(v[0] ?? 1)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Размер сохраняемого фото (сторона квадрата)</Label>
              <Select
                value={String(outputSize)}
                onValueChange={(v) => setOutputSize(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {outputSizeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            type="button"
            disabled={!croppedAreaPixels || applying || !objectUrl}
            onClick={() => void handleApply()}
          >
            {applying ? "Сохранение…" : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
