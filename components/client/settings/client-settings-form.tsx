"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { useClientSettings } from "@/hooks/use-client-settings";
import { useSecurityTabUi } from "@/hooks/use-security-tab-ui";
import { useAccountsTabUi } from "@/hooks/use-accounts-tab-ui";
import { SettingsFormErrorBoundary } from "@/components/settings/shared/settings-form-error-boundary";
import {
  SettingsAccountsTabTrigger,
  SettingsProfileTabTrigger,
  SettingsSecurityTabTrigger
} from "@/components/settings/shared/settings-core-tab-triggers";
import { SettingsFormErrorState, SettingsFormLoadingState } from "@/components/settings/shared/settings-page-states";
import { SettingsSecurityTab } from "@/components/settings/shared/settings-security-tab";
import { SettingsAccountsTab } from "@/components/settings/shared/settings-accounts-tab";
import { TelegramAccountBlockLazy } from "@/components/account/telegram-account-block.lazy";
import { ClientProfileTab } from "./client-profile-tab";

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
    return <SettingsFormLoadingState />;
  }

  if (!loading && (profileError || !profile?.user)) {
    return <SettingsFormErrorState variant="default" />;
  }

  return (
    <SettingsFormErrorBoundary logPrefix="[ClientSettingsForm]">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v ?? "profile")} className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1 bg-muted/80">
          <SettingsProfileTabTrigger variant="client" />
          <SettingsSecurityTabTrigger variant="client" />
          <SettingsAccountsTabTrigger variant="client" />
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          {activeTab === "profile" && profile && (
            <ClientProfileTab
              profile={profile}
              updateProfile={updateProfile}
              profileSyncVersion={profileDataUpdatedAt}
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
              telegramBlock={<TelegramAccountBlockLazy />}
            />
          )}
        </TabsContent>
      </Tabs>
    </SettingsFormErrorBoundary>
  );
}
