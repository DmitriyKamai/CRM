"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { cn } from "@/lib/utils";

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
};

export function ClientProfileTabsNav({
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
  updateTabsScrollState
}: Props) {
  const customGroups = Array.from(
    new Set(
      customFieldDefs
        .map((d) => (d.group && typeof d.group === "string" ? d.group.trim() : ""))
        .filter((g) => g.length > 0)
    )
  );

  return (
    <>
      {/* Узкие экраны: выбор вкладки из селекта */}
      <div className="w-full lg:hidden">
        <Select
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v);
            setDiagnosticsTabActive(v === "diagnostics");
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Выберите вкладку" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="profile">Личные данные</SelectItem>
            {customGroups.map((group) => (
              <SelectItem key={`cf-${group}`} value={`cf-${group}`}>
                {group}
              </SelectItem>
            ))}
            {diagnosticsOn && (
              <SelectItem value="diagnostics">Психологическая диагностика</SelectItem>
            )}
            {schedulingOn && <SelectItem value="appointments">Записи</SelectItem>}
            <SelectItem value="history">История</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Широкие экраны: вкладки со стрелками */}
      <div className="hidden w-full min-w-0 overflow-hidden lg:block">
        <div className="flex items-center gap-1 min-w-0">
          {tabsHaveOverflow && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-9 shrink-0 rounded-md"
              aria-label="Предыдущие вкладки"
              disabled={!tabsScrollLeft}
              onClick={() => {
                tabsScrollRef.current?.scrollBy({ left: -160, behavior: "smooth" });
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}

          <div
            ref={tabsScrollRef}
            className={cn(
              "overflow-x-auto overflow-y-hidden min-w-0 flex-1 basis-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            )}
            onScroll={updateTabsScrollState}
          >
            <TabsList className="inline-flex w-max h-10 flex-nowrap">
              <TabsTrigger value="profile" className="whitespace-nowrap shrink-0">
                Личные данные
              </TabsTrigger>

              {customGroups.map((group) => (
                <TabsTrigger
                  key={`cf-${group}`}
                  value={`cf-${group}`}
                  className="whitespace-nowrap shrink-0"
                >
                  {group}
                </TabsTrigger>
              ))}

              {diagnosticsOn && (
                <TabsTrigger value="diagnostics" className="whitespace-nowrap shrink-0">
                  Психологическая диагностика
                </TabsTrigger>
              )}

              {schedulingOn && (
                <TabsTrigger value="appointments" className="whitespace-nowrap shrink-0">
                  Записи
                </TabsTrigger>
              )}

              <TabsTrigger
                value="history"
                className="whitespace-nowrap shrink-0 lg:hidden inline-flex items-center gap-1.5"
              >
                <History className="h-4 w-4 shrink-0" aria-hidden />
                История
              </TabsTrigger>
            </TabsList>
          </div>

          {tabsHaveOverflow && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-9 shrink-0 rounded-md"
              aria-label="Следующие вкладки"
              disabled={!tabsScrollRight}
              onClick={() => {
                tabsScrollRef.current?.scrollBy({ left: 160, behavior: "smooth" });
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

