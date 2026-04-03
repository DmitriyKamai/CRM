"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

import { fitImageDisplaySize } from "@/lib/image-crop/fit-display-size";
import { squareCanvasToCircularJpegBlob } from "@/lib/image-crop/square-canvas-to-circular-jpeg";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DIALOG_INNER_SHELL,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
/** Экспорт кропа на сервер — один размер (квадрат), без выбора в UI. */
const EXPORT_SIDE_PX = 512;

/** Вертикальный предел области кропа (согласован с прежним h-[min(46dvh,420px)]). */
function maxCropViewportHeightPx(): number {
  if (typeof window === "undefined") return 420;
  return Math.min(window.innerHeight * 0.46, 420);
}

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
  onCroppedFile
}: ImageCropDialogProps) {
  const isRoundAvatar = cropPreviewShape === "round" && circularExport;

  const defaultDescription = isRoundAvatar
    ? "Рамка подогнана под размер фото. Перемещайте круг и тяните маркеры, чтобы выбрать область. Сохранение — 512×512 px."
    : "Рамка подогнана под размер фото. Двигайте и масштабируйте снимок, настройте рамку — углы и стороны можно тянуть. Сохранение — 512×512 px.";

  const cropperRef = useRef<CropperRef>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [availWidth, setAvailWidth] = useState(560);
  const [maxCropH, setMaxCropH] = useState(420);
  const [cropReady, setCropReady] = useState(false);
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
    if (open) setCropReady(false);
  }, [open, file]);

  useEffect(() => {
    if (!objectUrl) {
      setNaturalSize(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      setNaturalSize({
        w: img.naturalWidth,
        h: img.naturalHeight
      });
    };
    img.onerror = () => setNaturalSize(null);
    img.src = objectUrl;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [objectUrl]);

  useEffect(() => {
    const upd = () => setMaxCropH(maxCropViewportHeightPx());
    upd();
    window.addEventListener("resize", upd);
    return () => window.removeEventListener("resize", upd);
  }, []);

  useEffect(() => {
    if (!open) return;
    const el = measureRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setAvailWidth(Math.max(80, Math.floor(el.clientWidth)));
    });
    ro.observe(el);
    setAvailWidth(Math.max(80, Math.floor(el.clientWidth)));
    return () => ro.disconnect();
  }, [open, objectUrl]);

  const displaySize = useMemo(() => {
    if (!naturalSize) return null;
    return fitImageDisplaySize(naturalSize.w, naturalSize.h, availWidth, maxCropH);
  }, [naturalSize, availWidth, maxCropH]);

  /** После открытия, анимации и смены размера рамки пересчитываем boundary. */
  useEffect(() => {
    if (!open || !objectUrl) return;
    let cancelled = false;
    const refresh = () => {
      if (!cancelled) void cropperRef.current?.refresh?.();
    };
    const t0 = window.setTimeout(refresh, 0);
    const t1 = window.setTimeout(refresh, 150);
    const t2 = window.setTimeout(refresh, 320);
    return () => {
      cancelled = true;
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [open, objectUrl, displaySize?.width, displaySize?.height]);

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
        width: EXPORT_SIDE_PX,
        height: EXPORT_SIDE_PX,
        fillColor: "#ffffff",
        imageSmoothingQuality: "high"
      });
      if (!canvas) {
        toast.error("Не удалось получить изображение");
        return;
      }

      const blob = isRoundAvatar
        ? await squareCanvasToCircularJpegBlob(canvas, EXPORT_SIDE_PX, 0.9)
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
        scrollContainerClassName={DIALOG_INNER_SHELL}
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
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-0 pt-5">
            <div className="flex w-full flex-col gap-6">
              <div ref={measureRef} className="w-full">
                <div
                  className={cn(
                    "image-crop-dialog__viewport relative isolate mx-auto overflow-hidden rounded-xl bg-muted ring-1 ring-border/40",
                    !displaySize && "min-h-[220px] w-full sm:min-h-[240px]"
                  )}
                  style={
                    displaySize
                      ? {
                          width: displaySize.width,
                          height: displaySize.height
                        }
                      : undefined
                  }
                >
                <Cropper
                  key={objectUrl}
                  ref={cropperRef}
                  src={objectUrl}
                  imageRestriction={ImageRestriction.fitArea}
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
              </div>
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
