"use client";

import { useState } from "react";

/**
 * Активная вкладка настроек психолога.
 * При отключении расписания вкладка «Календарь» скрыта — для UI используется «Профиль», без setState в эффекте.
 */
export function usePsychologistSettingsActiveTab(schedulingEnabled: boolean) {
  const [storedTab, setActiveTab] = useState("profile");

  const activeTab =
    !schedulingEnabled && storedTab === "calendar" ? "profile" : storedTab;

  return { activeTab, setActiveTab };
}
