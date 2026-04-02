"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useClientSettings } from "@/hooks/use-client-settings";
import { useSecurityTabUi } from "@/hooks/use-security-tab-ui";
import { useAccountsTabUi } from "@/hooks/use-accounts-tab-ui";
import { SettingsFormTabsLayout } from "@/components/settings/shared/settings-form-tabs-layout";
import { ClientSettingsTabsList } from "@/components/settings/shared/client-settings-tabs-list";
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
    <SettingsFormTabsLayout
      logPrefix="[ClientSettingsForm]"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabsList={<ClientSettingsTabsList />}
      profileSlot={
        profile ? (
          <ClientProfileTab
            profile={profile}
            updateProfile={updateProfile}
            profileSyncVersion={profileDataUpdatedAt}
          />
        ) : null
      }
      securitySlot={
        <SettingsSecurityTab
          securityTab={securityTab}
          activeForSessions={activeTab === "security"}
        />
      }
      accountsSlot={
        <SettingsAccountsTab
          hasGoogle={hasGoogle}
          unlinkAccountProvider={unlinkAccountProvider}
          onUnlinkAccount={onUnlinkAccount}
          onLinkGoogle={onLinkGoogle}
          telegramBlock={<TelegramAccountBlockLazy />}
        />
      }
    />
  );
}
