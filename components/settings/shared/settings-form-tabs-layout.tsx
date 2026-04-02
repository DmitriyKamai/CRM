"use client";

import type { ReactNode } from "react";

import { Tabs, TabsContent } from "@/components/ui/tabs";
import { SettingsFormErrorBoundary } from "@/components/settings/shared/settings-form-error-boundary";

type Props = {
  logPrefix: string;
  activeTab: string;
  onTabChange: (value: string) => void;
  tabsList: ReactNode;
  /** Содержимое вкладки «Личные данные» (рендерится только при activeTab === "profile"). */
  profileSlot: ReactNode;
  /** Доп. блоки под формой личных данных (например будущие поля только для клиента). */
  profileTabFooter?: ReactNode;
  securitySlot: ReactNode;
  accountsSlot: ReactNode;
  /** Дополнительные `TabsContent` (вкладки психолога и т.п.). */
  children?: ReactNode;
};

/**
 * Общая оболочка настроек: ErrorBoundary + Tabs + три базовые вкладки (profile / security / accounts).
 * Ролевые расширения — через `profileTabFooter` и `children`.
 */
export function SettingsFormTabsLayout({
  logPrefix,
  activeTab,
  onTabChange,
  tabsList,
  profileSlot,
  profileTabFooter,
  securitySlot,
  accountsSlot,
  children
}: Props) {
  return (
    <SettingsFormErrorBoundary logPrefix={logPrefix}>
      <Tabs
        value={activeTab}
        onValueChange={(v) => onTabChange(v ?? "profile")}
        className="w-full"
      >
        {tabsList}

        <TabsContent value="profile" className="mt-4">
          {activeTab === "profile" && (
            <>
              {profileSlot}
              {profileTabFooter}
            </>
          )}
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          {activeTab === "security" && securitySlot}
        </TabsContent>

        <TabsContent value="accounts" className="mt-4">
          {activeTab === "accounts" && accountsSlot}
        </TabsContent>

        {children}
      </Tabs>
    </SettingsFormErrorBoundary>
  );
}
