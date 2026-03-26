"use client";

import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";

import { Tabs } from "@/components/ui/tabs";
import { ClientProfileTabsNav } from "@/components/psychologist/client-profile-tabs-nav";

type CustomFieldDefLike = { group?: string | null };

type Props = {
  activeTab: string;
  setActiveTab: Dispatch<SetStateAction<string>>;
  setDiagnosticsTabActive: Dispatch<SetStateAction<boolean>>;

  diagnosticsOn: boolean;
  schedulingOn: boolean;
  customFieldDefs: CustomFieldDefLike[];

  tabsHaveOverflow: boolean;
  tabsScrollLeft: boolean;
  tabsScrollRight: boolean;
  tabsScrollRef: RefObject<HTMLDivElement | null>;
  updateTabsScrollState: () => void;

  left: ReactNode;
  right?: ReactNode;
};

export function ClientProfileTabsShell({
  activeTab,
  setActiveTab,
  setDiagnosticsTabActive,

  diagnosticsOn,
  schedulingOn,
  customFieldDefs,

  tabsHaveOverflow,
  tabsScrollLeft,
  tabsScrollRight,
  tabsScrollRef,
  updateTabsScrollState,

  left,
  right
}: Props) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => {
        setActiveTab(v);
        setDiagnosticsTabActive(v === "diagnostics");
      }}
      className="w-full min-w-0"
    >
      <ClientProfileTabsNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setDiagnosticsTabActive={setDiagnosticsTabActive}
        diagnosticsOn={diagnosticsOn}
        schedulingOn={schedulingOn}
        customFieldDefs={customFieldDefs}
        tabsHaveOverflow={tabsHaveOverflow}
        tabsScrollLeft={tabsScrollLeft}
        tabsScrollRight={tabsScrollRight}
        tabsScrollRef={tabsScrollRef}
        updateTabsScrollState={updateTabsScrollState}
      />

      <div className="mt-3 flex flex-col lg:flex-row gap-4 lg:items-start min-w-0 w-full">
        <div className="min-w-0 w-full lg:w-auto flex-1">{left}</div>
        {right}
      </div>
    </Tabs>
  );
}

