"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useClientProfileTabsScrollState(depsLength: number) {
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [tabsScrollLeft, setTabsScrollLeft] = useState(false);
  const [tabsScrollRight, setTabsScrollRight] = useState(false);
  const [tabsHaveOverflow, setTabsHaveOverflow] = useState(false);

  const updateTabsScrollState = useCallback(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setTabsHaveOverflow(scrollWidth > clientWidth);
    setTabsScrollLeft(scrollLeft > 0);
    setTabsScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const run = () => {
      updateTabsScrollState();
      const el = tabsScrollRef.current;
      if (!el) return;

      const ro = new ResizeObserver(updateTabsScrollState);
      ro.observe(el);
      cleanup = () => ro.disconnect();
    };

    const t1 = setTimeout(run, 0);
    const t2 = setTimeout(run, 350);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      cleanup?.();
    };
  }, [updateTabsScrollState, depsLength]);

  return {
    tabsScrollRef,
    tabsScrollLeft,
    tabsScrollRight,
    tabsHaveOverflow,
    updateTabsScrollState
  };
}

