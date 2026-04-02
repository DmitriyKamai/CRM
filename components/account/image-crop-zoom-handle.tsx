"use client";

import { useCallback, useRef } from "react";
import { Scaling } from "lucide-react";

import { cn } from "@/lib/utils";

const MIN_Z = 1;
const MAX_Z = 3;

type Props = {
  zoom: number;
  onZoomChange: (z: number) => void;
  className?: string;
  /** Подпись для a11y */
  label?: string;
};

/**
 * Масштаб: перетаскивание ручки (вертикаль — как «раздвигание» кадра). Колёсико на области кропа тоже работает.
 */
export function ImageCropZoomHandle({
  zoom,
  onZoomChange,
  className,
  label = "Масштаб: перетащите вверх или вниз"
}: Props) {
  const dragRef = useRef<{ startY: number; startZoom: number } | null>(null);

  const clampZoom = useCallback((z: number) => Math.min(MAX_Z, Math.max(MIN_Z, z)), []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = { startY: e.clientY, startZoom: zoom };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [zoom]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = dragRef.current;
      if (!d) return;
      const dy = d.startY - e.clientY;
      onZoomChange(clampZoom(d.startZoom + dy * 0.012));
    },
    [clampZoom, onZoomChange]
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* уже отпущен */
    }
  }, []);

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "flex h-9 w-9 shrink-0 cursor-nwse-resize items-center justify-center rounded-md border border-primary/40 bg-background/95 text-primary shadow-md backdrop-blur-sm",
        "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "touch-none select-none",
        className
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <Scaling className="h-4 w-4" aria-hidden />
    </button>
  );
}
