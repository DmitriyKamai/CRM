"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { User, Lock, Link2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientSettings } from "@/hooks/use-client-settings";
import { useSecurityTabUi } from "@/hooks/use-security-tab-ui";
import { useAccountsTabUi } from "@/hooks/use-accounts-tab-ui";
import { SettingsFormErrorBoundary } from "@/components/settings/shared/settings-form-error-boundary";
import { SettingsSecurityTab } from "@/components/settings/shared/settings-security-tab";
import { SettingsAccountsTab } from "@/components/settings/shared/settings-accounts-tab";
import { ClientProfileTab } from "./client-profile-tab";

const TelegramAccountBlock = dynamic(
  () =>
    import("@/components/account/telegram-account-block").then((m) => ({
      default: m.TelegramAccountBlock
    })),
  { ssr: false }
);

export function ClientSettingsForm() {
  const { update: updateSession } = useSession();
  const {
    profile,
    accounts,
    loading,
    profileError,
    profileDataUpdatedAt,
    updateProfile,
    changePassword,
    refetchAccounts
  } = useClientSettings();

  const securityTab = useSecurityTabUi({
    submitChangePassword: (body) => changePassword.mutateAsync(body)
  });

  const accountsTab = useAccountsTabUi({
    accounts,
    refetchAccounts,
    updateSession
  });
  const { hasGoogle, unlinkAccountProvider, onUnlinkAccount, onLinkGoogle } = accountsTab;

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

  return (
    <SettingsFormErrorBoundary logPrefix="[ClientSettingsForm]">
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
            <SettingsSecurityTab
              securityTab={securityTab}
              activeForSessions={activeTab === "security"}
            />
          )}
        </TabsContent>

        <TabsContent value="accounts" className="mt-4">
          {activeTab === "accounts" && (
            <SettingsAccountsTab
              hasGoogle={hasGoogle}
              unlinkAccountProvider={unlinkAccountProvider}
              onUnlinkAccount={onUnlinkAccount}
              onLinkGoogle={onLinkGoogle}
              telegramBlock={<TelegramAccountBlock />}
            />
          )}
        </TabsContent>
      </Tabs>
    </SettingsFormErrorBoundary>
  );
}
