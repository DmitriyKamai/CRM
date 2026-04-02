"use client";

import { useState } from "react";
import { User, Lock, Link2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientSettings } from "@/hooks/use-client-settings";
import { useSecurityTabUi } from "@/hooks/use-security-tab-ui";
import { useAccountsTabUi } from "@/hooks/use-accounts-tab-ui";
import { SettingsFormErrorBoundary } from "@/components/settings/shared/settings-form-error-boundary";
import { SettingsSection } from "@/components/settings/shared/settings-section";
import { SecurityTabForm } from "@/components/settings/shared/settings-password-form";
import { LinkedAccountsTabContent } from "@/components/settings/shared/linked-accounts-tab-content";
import { ActiveSessionsSection } from "@/components/account/active-sessions-section";
import { TelegramAccountBlock } from "@/components/account/telegram-account-block";
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

  const {
    handleChangePassword,
    currentPassword,
    onCurrentPasswordChange,
    newPassword,
    onNewPasswordChange,
    newPasswordConfirm,
    onNewPasswordConfirmChange,
    newPasswordChecks,
    newPasswordValid,
    passwordSaving,
    passwordRequirements,
    progressTrackColor,
    progressFillColor,
    progressFillWidthPct
  } = securityTab;

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
            <>
              <SettingsSection title="Смена пароля">
                <SecurityTabForm
                  handleChangePassword={handleChangePassword}
                  currentPassword={currentPassword}
                  onCurrentPasswordChange={onCurrentPasswordChange}
                  newPassword={newPassword}
                  onNewPasswordChange={onNewPasswordChange}
                  newPasswordConfirm={newPasswordConfirm}
                  onNewPasswordConfirmChange={onNewPasswordConfirmChange}
                  newPasswordChecks={newPasswordChecks}
                  newPasswordValid={newPasswordValid}
                  passwordSaving={passwordSaving}
                  passwordRequirements={passwordRequirements}
                  progressTrackColor={progressTrackColor}
                  progressFillColor={progressFillColor}
                  progressFillWidthPct={progressFillWidthPct}
                />
              </SettingsSection>
              <SettingsSection title="Активные сессии">
                <ActiveSessionsSection active={activeTab === "security"} />
              </SettingsSection>
            </>
          )}
        </TabsContent>

        <TabsContent value="accounts" className="mt-4">
          {activeTab === "accounts" && (
            <SettingsSection title="Привязка аккаунтов">
              <LinkedAccountsTabContent
                hasGoogle={hasGoogle}
                unlinkAccountProvider={unlinkAccountProvider}
                onUnlinkAccount={onUnlinkAccount}
                onLinkGoogle={onLinkGoogle}
                telegramBlock={<TelegramAccountBlock />}
              />
            </SettingsSection>
          )}
        </TabsContent>
      </Tabs>
    </SettingsFormErrorBoundary>
  );
}
