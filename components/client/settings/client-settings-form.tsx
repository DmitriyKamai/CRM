"use client";

import { useState } from "react";
import { User, Lock, Link2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientSettings } from "@/hooks/use-client-settings";
import { ClientSettingsFormErrorBoundary } from "./settings-form-error-boundary";
import { ClientProfileTab } from "./client-profile-tab";
import { ClientSecurityTab } from "./client-security-tab";
import { ClientAccountsTab } from "./client-accounts-tab";

export function ClientSettingsForm() {
  const {
    profile,
    accounts,
    loading,
    profileError,
    profileDataUpdatedAt,
    updateProfile,
    changePassword,
    unlinkAccount
  } = useClientSettings();
  const [activeTab, setActiveTab] = useState("profile");

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-8">Загрузка настроек…</div>
    );
  }

  if (!loading && (profileError || !profile?.user)) {
    return (
      <div className="text-sm text-muted-foreground py-8">
        Не удалось загрузить настройки. Обновите страницу.
      </div>
    );
  }

  const hasGoogle = accounts.some((a) => a.provider === "google");

  return (
    <ClientSettingsFormErrorBoundary>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v ?? "profile")} className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1 bg-muted/80">
          <TabsTrigger value="profile" className="flex items-center gap-2 shrink-0">
            <User className="h-4 w-4" />
            Личные данные
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 shrink-0">
            <Lock className="h-4 w-4" />
            Безопасность
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center gap-2 shrink-0">
            <Link2 className="h-4 w-4" />
            Аккаунты
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          {activeTab === "profile" && profile && (
            <ClientProfileTab
              key={profileDataUpdatedAt}
              profile={profile}
              updateProfile={updateProfile}
            />
          )}
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          {activeTab === "security" && (
            <ClientSecurityTab
              changePassword={changePassword}
              sessionsActive={activeTab === "security"}
            />
          )}
        </TabsContent>

        <TabsContent value="accounts" className="mt-4">
          {activeTab === "accounts" && (
            <ClientAccountsTab hasGoogle={hasGoogle} unlinkAccount={unlinkAccount} />
          )}
        </TabsContent>
      </Tabs>
    </ClientSettingsFormErrorBoundary>
  );
}
