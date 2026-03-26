"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect } from "react";

export function useClientProfileTabsState(opts: {
  activeTab: string;
  setActiveTab: Dispatch<SetStateAction<string>>;
  diagnosticsOn: boolean;
  schedulingOn: boolean;
}) {
  const { activeTab, setActiveTab, diagnosticsOn, schedulingOn } = opts;

  // Сброс вкладок, если модуль выключили
  useEffect(() => {
    void (async () => {
      if (!diagnosticsOn && activeTab === "diagnostics") setActiveTab("profile");
      if (!schedulingOn && activeTab === "appointments") setActiveTab("profile");
    })();
  }, [diagnosticsOn, schedulingOn, activeTab, setActiveTab]);

  // На desktop история не является вкладкой (уходит в сайдбар)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const syncTab = () => {
      if (mq.matches && activeTab === "history") setActiveTab("profile");
    };
    syncTab();
    mq.addEventListener("change", syncTab);
    return () => mq.removeEventListener("change", syncTab);
  }, [activeTab, setActiveTab]);
}

