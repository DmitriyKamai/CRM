"use client";

import { useEffect, useRef, useState } from "react";

export function useClientsListScale(opts: { deps: unknown[] }) {
  const { deps } = opts;
  const depA = deps[0];
  const depB = deps[1];
  const depC = deps[2];

  const minListWidth = 1;
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const listInnerRef = useRef<HTMLDivElement | null>(null);
  const [listScale, setListScale] = useState(1);
  const [listInnerHeight, setListInnerHeight] = useState(0);

  useEffect(() => {
    const el = listContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w <= 0) return;
      setListScale(w >= minListWidth ? 1 : Math.max(0.3, w / minListWidth));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [minListWidth]);

  useEffect(() => {
    if (listScale >= 1) return;
    const el = listInnerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setListInnerHeight(el.offsetHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [listScale, depA, depB, depC]);

  const listScaled = listScale < 1;

  return {
    minListWidth,
    listContainerRef,
    listInnerRef,
    listScale,
    listInnerHeight,
    listScaled
  };
}

export type ClientsListScaleState = ReturnType<typeof useClientsListScale>;

