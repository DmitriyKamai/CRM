"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import type { CircularAvatarCropParams } from "@/lib/image-crop/circular-avatar-crop-types";
import { cn } from "@/lib/utils";

const EDGE_HIT_PX = 14;

type DragState =
  | {
      kind: "pan";
      startX: number;
      startY: number;
      startCx: number;
      startCy: number;
    }
  | {
      kind: "edge";
      startDist: number;
      startR: number;
      centerX: number;
      centerY: number;
    };

type Props = {
  imageSrc: string;
  active: boolean;
  className?: string;
  onParamsChange: (p: CircularAvatarCropParams | null) => void;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Превью: изображение неподвижно (cover), перетаскивается круг, радиус — за внешний край.
 */
export function CircularAvatarCropStage({ imageSrc, active, className, onParamsChange }: Props) {
  const maskId = `crop-mask-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const initedForSrc = useRef<string | null>(null);

  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [cx, setCx] = useState(0);
  const [cy, setCy] = useState(0);
  const [r, setR] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragKind, setDragKind] = useState<"pan" | "edge" | null>(null);
  const [hoverKind, setHoverKind] = useState<"out" | "pan" | "edge">("out");

  const rBounds = useCallback(
    (w: number, h: number) => ({
      min: Math.min(48, Math.min(w, h) * 0.12),
      max: Math.min(w, h) * 0.48
    }),
    []
  );

  const initCrop = useCallback(
    (w: number, h: number) => {
      const { min, max } = rBounds(w, h);
      const rr = clamp(Math.min(w, h) * 0.36, min, max);
      setCx(w / 2);
      setCy(h / 2);
      setR(rr);
    },
    [rBounds]
  );

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w < 16 || h < 16) return;
      setDims((prev) => {
        if (prev.w === w && prev.h === h) return prev;
        return { w, h };
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Сброс круга при новом файле и первом измерении контейнера (не при каждом resize). */
  useEffect(() => {
    if (!active || dims.w < 16 || dims.h < 16) return;
    if (initedForSrc.current === imageSrc) return;
    initedForSrc.current = imageSrc;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- одноразовая инициализация круга по размерам превью
    initCrop(dims.w, dims.h);
  }, [active, imageSrc, dims.w, dims.h, initCrop]);

  useEffect(() => {
    if (!active) initedForSrc.current = null;
  }, [active]);

  const cover = useCallback(() => {
    const nw = natural.w;
    const nh = natural.h;
    const W = dims.w;
    const H = dims.h;
    if (nw < 1 || nh < 1 || W < 1 || H < 1) {
      return { scale: 1, left: 0, top: 0, drawW: W, drawH: H };
    }
    const scale = Math.max(W / nw, H / nh);
    const drawW = nw * scale;
    const drawH = nh * scale;
    const left = (W - drawW) / 2;
    const top = (H - drawH) / 2;
    return { scale, left, top, drawW, drawH };
  }, [natural.w, natural.h, dims.w, dims.h]);

  useEffect(() => {
    if (!active || dims.w < 1 || dims.h < 1 || natural.w < 1 || natural.h < 1) {
      onParamsChange(null);
      return;
    }
    const { min, max } = rBounds(dims.w, dims.h);
    const rc = clamp(r, min, max);
    const cxc = clamp(cx, rc, dims.w - rc);
    const cyc = clamp(cy, rc, dims.h - rc);
    onParamsChange({
      containerW: dims.w,
      containerH: dims.h,
      cx: cxc,
      cy: cyc,
      r: rc,
      naturalW: natural.w,
      naturalH: natural.h
    });
  }, [active, cx, cy, r, dims.w, dims.h, natural.w, natural.h, onParamsChange, rBounds]);

  const hitTest = useCallback(
    (mx: number, my: number): "out" | "pan" | "edge" => {
      const { min, max } = rBounds(dims.w, dims.h);
      const rClamped = clamp(r, min, max);
      const dist = Math.hypot(mx - cx, my - cy);
      if (dist > rClamped + EDGE_HIT_PX) return "out";
      if (dist >= rClamped - EDGE_HIT_PX && dist <= rClamped + EDGE_HIT_PX) return "edge";
      return "pan";
    },
    [cx, cy, r, dims.w, dims.h, rBounds]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current || natural.w < 1) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const dist = Math.hypot(mx - cx, my - cy);

    const { min, max } = rBounds(dims.w, dims.h);
    const rClamped = clamp(r, min, max);

    if (dist > rClamped + EDGE_HIT_PX) return;

    e.preventDefault();
    e.stopPropagation();
    setDragging(true);

    if (dist >= rClamped - EDGE_HIT_PX && dist <= rClamped + EDGE_HIT_PX) {
      setDragKind("edge");
      dragRef.current = {
        kind: "edge",
        startDist: dist,
        startR: rClamped,
        centerX: cx,
        centerY: cy
      };
    } else {
      setDragKind("pan");
      dragRef.current = {
        kind: "pan",
        startX: e.clientX,
        startY: e.clientY,
        startCx: cx,
        startCy: cy
      };
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const d = dragRef.current;
    if (!d) {
      setHoverKind(hitTest(mx, my));
      return;
    }

    if (!containerRef.current) return;

    const { min, max } = rBounds(dims.w, dims.h);

    if (d.kind === "pan") {
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      let ncx = d.startCx + dx;
      let ncy = d.startCy + dy;
      const rr = clamp(r, min, max);
      ncx = clamp(ncx, rr, dims.w - rr);
      ncy = clamp(ncy, rr, dims.h - rr);
      setCx(ncx);
      setCy(ncy);
      return;
    }

    const dist = Math.hypot(mx - d.centerX, my - d.centerY);
    const nr = clamp(d.startR + (dist - d.startDist), min, max);
    setR(nr);
    setCx((c) => clamp(c, nr, dims.w - nr));
    setCy((c) => clamp(c, nr, dims.h - nr));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    setDragging(false);
    setDragKind(null);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* */
    }
  };

  const onPointerLeave = () => {
    if (!dragRef.current) setHoverKind("out");
  };

  const { left, top, drawW, drawH } = cover();
  const cursor =
    dragging && dragKind === "edge"
      ? "nwse-resize"
      : dragging
        ? "grabbing"
        : hoverKind === "edge"
          ? "nwse-resize"
          : hoverKind === "pan"
            ? "grab"
            : "default";

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-[min(55vh,400px)] w-full touch-none select-none overflow-hidden rounded-lg bg-muted",
        className
      )}
      style={{ cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt=""
        draggable={false}
        className="pointer-events-none absolute select-none"
        style={{ left, top, width: drawW, height: drawH }}
        onLoad={(ev) => {
          const el = ev.currentTarget;
          setNatural({ w: el.naturalWidth, h: el.naturalHeight });
        }}
      />

      {dims.w > 0 && dims.h > 0 && (
        <svg
          className="pointer-events-none absolute left-0 top-0"
          width={dims.w}
          height={dims.h}
          aria-hidden
        >
          <defs>
            <mask id={maskId}>
              <rect width={dims.w} height={dims.h} fill="white" />
              <circle cx={cx} cy={cy} r={r} fill="black" />
            </mask>
          </defs>
          <rect
            width={dims.w}
            height={dims.h}
            fill="rgba(0,0,0,0.55)"
            mask={`url(#${maskId})`}
          />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="hsl(var(--background))"
            strokeWidth={3}
          />
        </svg>
      )}
    </div>
  );
}
