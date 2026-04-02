"use client";

import { useSession } from "next-auth/react";

import { useAccountsTabUi } from "@/hooks/use-accounts-tab-ui";
import { useSecurityTabUi } from "@/hooks/use-security-tab-ui";
import { useUserSettings, type UserSettingsVariant } from "@/hooks/use-user-settings";
import { postChangePassword } from "@/lib/user-settings/post-change-password";

/**
 * Общая оркестрация вкладок настроек (сессия, профиль/аккаунты из TanStack Query, безопасность, связанные аккаунты).
 * Различается только вариантом смены пароля: клиент — мутация с отдельным UX, психолог — прямой POST.
 */
export function useSettingsFormShell(variant: UserSettingsVariant) {
  const { data: session, update: updateSession } = useSession();
  const settings = useUserSettings({ variant });

  const securityTab = useSecurityTabUi({
    submitChangePassword:
      variant === "client"
        ? (body) => settings.changePassword.mutateAsync(body)
        : postChangePassword
  });

  const accountsTab = useAccountsTabUi({
    accounts: settings.accounts,
    refetchAccounts: settings.refetchAccounts,
    updateSession
  });

  return {
    session,
    updateSession,
    ...settings,
    securityTab,
    accountsTab
  };
}
