"use client";

import type { ReactNode } from "react";

import type { SecurityTabUiState } from "@/hooks/use-security-tab-ui";
import { ActiveSessionsSection } from "@/components/account/active-sessions-section";
import { SecurityTabForm } from "@/components/settings/shared/settings-password-form";
import { SettingsSection } from "@/components/settings/shared/settings-section";

export function SettingsSecurityTab({
  securityTab,
  activeForSessions,
  extraSections
}: {
  securityTab: SecurityTabUiState;
  activeForSessions: boolean;
  extraSections?: ReactNode;
}) {
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

  return (
    <div className="space-y-4">
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
        <ActiveSessionsSection active={activeForSessions} />
      </SettingsSection>
      {extraSections}
    </div>
  );
}
