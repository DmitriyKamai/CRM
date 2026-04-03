"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CircleStencil,
  Cropper,
  type CropperRef,
  RectangleStencil
} from "react-advanced-cropper";
import "react-advanced-cropper/dist/style.css";
import "react-advanced-cropper/dist/themes/default.css";
import { toast } from "sonner";

import { squareCanvasToCircularJpegBlob } from "@/lib/image-crop/square-canvas-to-circular-jpeg";
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
  /** Соотношение сторон прямоугольного стенсила (1 = квадрат). Круг всегда 1:1. */
  aspect: number;
  /** Вид рамки: круг (аватар) или прямоугольник (фото профиля). */
  cropPreviewShape?: "rect" | "round";
  /** Итоговый JPEG с круглой маской и белыми углами (аватар). */
  circularExport?: boolean;
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
  cropPreviewShape = "rect",
  circularExport = false,
  title,
  description,
  outputSizeOptions = DEFAULT_OUTPUT_OPTIONS,
  defaultOutputSize = 512,
  onCroppedFile
}: ImageCropDialogProps) {
  const isRoundAvatar = cropPreviewShape === "round" && circularExport;

  const defaultDescription = isRoundAvatar
    ? "Перетащите круг и при необходимости потяните за маркеры по контуру, чтобы изменить масштаб области. Фото под стенсилом двигается стандартными жестами кропера."
    : "Перемещайте и масштабируйте фото, настройте рамку. Углы и стороны рамки можно тянуть для размера.";

  const cropperRef = useRef<CropperRef>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [cropReady, setCropReady] = useState(false);
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
      setCropReady(false);
      setOutputSize(defaultOutputSize);
    }
  }, [open, file, defaultOutputSize]);

  const syncReady = useCallback(() => {
    const c = cropperRef.current;
    setCropReady(Boolean(c?.isLoaded()));
  }, []);

  const handleApply = async () => {
    const c = cropperRef.current;
    if (!c?.isLoaded() || !file) return;
    setApplying(true);
    try {
      const canvas = c.getCanvas({
        width: outputSize,
        height: outputSize,
        fillColor: "#ffffff",
        imageSmoothingQuality: "high"
      });
      if (!canvas) {
        toast.error("Не удалось получить изображение");
        return;
      }

      const blob = isRoundAvatar
        ? await squareCanvasToCircularJpegBlob(canvas, outputSize, 0.9)
        : await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              (b) => (b ? resolve(b) : reject(new Error("toBlob"))),
              "image/jpeg",
              0.9
            );
          });

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
          <DialogDescription>{description ?? defaultDescription}</DialogDescription>
        </DialogHeader>

        {objectUrl ? (
          <div className="space-y-4">
            <div className="relative h-[min(55vh,400px)] w-full min-h-[280px] overflow-hidden rounded-lg border border-border/60 bg-muted">
              <Cropper
                key={objectUrl}
                ref={cropperRef}
                src={objectUrl}
                className="advanced-cropper h-full !max-h-none bg-muted"
                stencilComponent={isRoundAvatar ? CircleStencil : RectangleStencil}
                stencilProps={
                  isRoundAvatar
                    ? { movable: true, resizable: true, grid: false }
                    : {
                        movable: true,
                        resizable: true,
                        aspectRatio: aspect,
                        grid: true
                      }
                }
                onReady={syncReady}
                onUpdate={syncReady}
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
            disabled={!cropReady || applying || !objectUrl}
            onClick={() => void handleApply()}
          >
            {applying ? "Сохранение…" : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
