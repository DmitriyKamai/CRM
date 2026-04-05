"use client";

import { SettingsSection } from "@/components/settings/shared/settings-section";
import { SettingsFormTabsLayout } from "@/components/settings/shared/settings-form-tabs-layout";
import { SettingsFormErrorState, SettingsFormLoadingState } from "@/components/settings/shared/settings-page-states";
import { SettingsSecurityTab } from "@/components/settings/shared/settings-security-tab";
import { SettingsAccountsTab } from "@/components/settings/shared/settings-accounts-tab";
import { TelegramAccountBlockLazy } from "@/components/account/telegram-account-block.lazy";
import { useSettingsFormShell } from "@/hooks/use-settings-form-shell";
import { usePersonalProfileTabUi } from "@/hooks/use-personal-profile-tab-ui";
import { useProfessionalTabUi } from "@/hooks/use-professional-tab-ui";
import { usePsychologistSettingsActiveTab } from "@/hooks/use-psychologist-settings-active-tab";
import { CalendarFeedTokenRotateSection } from "@/components/psychologist/settings/calendar-feed-token-rotate-section";
import { PsychologistProfileSettingsTab } from "@/components/psychologist/settings/psychologist-profile-settings-tab";
import { PsychologistTabsList } from "@/components/psychologist/settings/psychologist-tabs-list";
import { PsychologistSettingsCustomFieldsTab } from "@/components/psychologist/settings/psychologist-settings-custom-fields-tab";
import { PsychologistSettingsStatusesTab } from "@/components/psychologist/settings/psychologist-settings-statuses-tab";
import { PsychologistSettingsCalendarTab } from "@/components/psychologist/settings/psychologist-settings-calendar-tab";
import { PsychologistSettingsProfessionalTab } from "@/components/psychologist/settings/psychologist-settings-professional-tab";

export function PsychologistSettingsForm({
  schedulingEnabled = true
}: {
  schedulingEnabled?: boolean;
}) {
  const {
    session,
    updateSession,
    profile,
    loading,
    refetchProfile,
    profileDataUpdatedAt,
    updateProfile,
    securityTab,
    accountsTab
  } = useSettingsFormShell("psychologist");

  const { activeTab, setActiveTab } = usePsychologistSettingsActiveTab(schedulingEnabled);

  const profileTab = usePersonalProfileTabUi({
    profile,
    session,
    patchProfile: updateProfile,
    profileSyncVersion: profileDataUpdatedAt
  });

  const professionalTab = useProfessionalTabUi({
    profile,
    profileSyncVersion: profileDataUpdatedAt,
    updateSession,
    patchProfile: updateProfile
  });

  const { unlinkAccountProvider, hasGoogle, onUnlinkAccount, onLinkGoogle } = accountsTab;

  if (loading) return <SettingsFormLoadingState />;
  if (!profile) return <SettingsFormErrorState variant="network" />;
  if (!profile.user) return <SettingsFormErrorState variant="default" />;

  const { initials, alt } = profileTab;

  return (
    <SettingsFormTabsLayout
      logPrefix="[PsychologistSettingsForm]"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabsList={<PsychologistTabsList schedulingEnabled={schedulingEnabled} />}
      profileSlot={
        <PsychologistProfileSettingsTab profileTab={profileTab} updateSession={updateSession} />
      }
      securitySlot={
        <SettingsSecurityTab
          securityTab={securityTab}
          activeForSessions={activeTab === "security"}
          extraSections={
            schedulingEnabled ? (
              <SettingsSection title="Ссылка подписки на календарь">
                <CalendarFeedTokenRotateSection />
              </SettingsSection>
            ) : undefined
          }
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
    >
      <PsychologistSettingsCustomFieldsTab activeTab={activeTab} />
      <PsychologistSettingsStatusesTab activeTab={activeTab} />
      <PsychologistSettingsCalendarTab schedulingEnabled={schedulingEnabled} activeTab={activeTab} />
      <PsychologistSettingsProfessionalTab
        activeTab={activeTab}
        profilePhotoUrl={profile.psychologistProfile?.profilePhotoUrl ?? null}
        professionalTab={professionalTab}
        initials={initials}
        alt={alt || "Психолог"}
        onRefetchProfile={refetchProfile}
      />
    </SettingsFormTabsLayout>
  );
}
