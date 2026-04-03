"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CircleStencil,
  Cropper,
  type CropperRef,
  ImageRestriction,
  RectangleStencil
} from "react-advanced-cropper";
import "react-advanced-cropper/dist/style.css";
import "react-advanced-cropper/dist/themes/default.css";
import "./image-crop-dialog-overrides.css";
import { toast } from "sonner";

import { squareCanvasToCircularJpegBlob } from "@/lib/image-crop/square-canvas-to-circular-jpeg";
import { cn } from "@/lib/utils";
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

/** Экспорт аватара на сервер — один разумный размер, без выбора в UI. */
const AVATAR_EXPORT_PX = 512;

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
  /**
   * Показывать выбор стороны квадрата экспорта. Для аватара выключайте — размер фиксированный.
   * @default true для прямоугольного кропа, false если round + circularExport
   */
  showOutputSizeSelect?: boolean;
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
  showOutputSizeSelect: showOutputSizeSelectProp,
  title,
  description,
  outputSizeOptions = DEFAULT_OUTPUT_OPTIONS,
  defaultOutputSize = 512,
  onCroppedFile
}: ImageCropDialogProps) {
  const isRoundAvatar = cropPreviewShape === "round" && circularExport;
  const showOutputSizeSelect =
    showOutputSizeSelectProp ?? !isRoundAvatar;

  const defaultDescription = isRoundAvatar
    ? "Фото заполняет область (края могут быть за пределами экрана). Перемещайте круг и тяните маркеры, чтобы выбрать фрагмент."
    : "Видно всё фото в рамке. Двигайте и масштабируйте снимок, настройте рамку — углы и стороны можно тянуть.";

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
      const side = isRoundAvatar ? AVATAR_EXPORT_PX : outputSize;
      const canvas = c.getCanvas({
        width: side,
        height: side,
        fillColor: "#ffffff",
        imageSmoothingQuality: "high"
      });
      if (!canvas) {
        toast.error("Не удалось получить изображение");
        return;
      }

      const blob = isRoundAvatar
        ? await squareCanvasToCircularJpegBlob(canvas, AVATAR_EXPORT_PX, 0.9)
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
      <DialogContent
        scrollContainerClassName={cn(
          "flex min-h-0 max-h-[min(90dvh,880px)] flex-col gap-0 overflow-hidden p-0 rounded-xl"
        )}
        className={cn("max-w-2xl gap-0 sm:max-w-2xl")}
      >
        <div className="shrink-0 border-b border-border/50 px-6 pb-3 pt-6 pr-14">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="pr-2 leading-snug">{title}</DialogTitle>
            <DialogDescription className="text-pretty leading-relaxed">
              {description ?? defaultDescription}
            </DialogDescription>
          </DialogHeader>
        </div>

        {objectUrl ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
            <div className="flex w-full flex-col gap-6">
              <div
                className={cn(
                  "image-crop-dialog__viewport relative isolate w-full overflow-hidden rounded-xl bg-muted ring-1 ring-border/40",
                  "h-[min(46dvh,420px)] min-h-[220px] sm:min-h-[240px]"
                )}
              >
                <Cropper
                  key={objectUrl}
                  ref={cropperRef}
                  src={objectUrl}
                  imageRestriction={
                    isRoundAvatar ? ImageRestriction.fillArea : ImageRestriction.fitArea
                  }
                  className="advanced-cropper !max-h-none absolute inset-0 min-h-0 w-full"
                  style={{ backgroundColor: "hsl(var(--muted))" }}
                    backgroundWrapperProps={
                      isRoundAvatar
                        ? { moveImage: false, scaleImage: false }
                        : undefined
                    }
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

              {showOutputSizeSelect ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground" htmlFor="image-crop-output-size">
                    Размер сохраняемого фото (сторона квадрата)
                  </Label>
                  <Select
                    value={String(outputSize)}
                    onValueChange={(v) => setOutputSize(Number(v))}
                  >
                    <SelectTrigger
                      id="image-crop-output-size"
                      className="w-full focus-visible:ring-1 focus-visible:ring-border focus-visible:ring-offset-0"
                    >
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
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="shrink-0 border-t border-border/50 px-6 py-4">
          <DialogFooter className="mt-0 flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3 sm:space-x-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              type="button"
              className="min-w-[8.5rem] shrink-0"
              disabled={!cropReady || applying || !objectUrl}
              onClick={() => void handleApply()}
            >
              {applying ? "Сохранение…" : "Сохранить"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
