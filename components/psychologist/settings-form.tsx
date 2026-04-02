"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { MARITAL_OPTIONS } from "@/lib/settings/marital-options";
import { BIO_MAX_LENGTH, PROFESSION_OPTIONS } from "@/lib/settings/professional-profile";
import { SettingsSection } from "@/components/settings/shared/settings-section";
import { SettingsFormErrorBoundary } from "@/components/settings/shared/settings-form-error-boundary";
import { SettingsFormErrorState, SettingsFormLoadingState } from "@/components/settings/shared/settings-page-states";
import { SettingsSecurityTab } from "@/components/settings/shared/settings-security-tab";
import { SettingsAccountsTab } from "@/components/settings/shared/settings-accounts-tab";
import { TelegramAccountBlockLazy } from "@/components/account/telegram-account-block.lazy";
import { useProfileSettings } from "@/hooks/use-profile-settings";
import { usePersonalProfileTabUi } from "@/hooks/use-personal-profile-tab-ui";
import { useProfessionalTabUi } from "@/hooks/use-professional-tab-ui";
import { useSecurityTabUi } from "@/hooks/use-security-tab-ui";
import { CustomFieldsTabSection } from "@/components/psychologist/settings/custom-fields-tab-section";
import { useClientStatusesSettings } from "@/hooks/use-client-statuses-settings";
import { useClientStatusesTabUi } from "@/hooks/use-client-statuses-tab-ui";
import { CalendarFeedTokenRotateSection } from "@/components/psychologist/settings/calendar-feed-token-rotate-section";
import { ClientStatusesTabPanel } from "@/components/psychologist/settings/client-statuses-tab-panel";
import { ProfessionalTabPanel } from "@/components/psychologist/settings/professional-tab-panel";
import { ProfileTabPanel } from "@/components/psychologist/settings/profile-tab-panel";
import { PsychologistTabsList } from "@/components/psychologist/settings/psychologist-tabs-list";
import { useAccountsTabUi } from "@/hooks/use-accounts-tab-ui";
import { postChangePassword } from "@/lib/user-settings/post-change-password";

const CalendarSubscriptionBlock = dynamic(
  () => import("@/components/schedule/calendar-subscription").then((m) => ({ default: m.CalendarSubscriptionBlock })),
  { ssr: false }
);

export function PsychologistSettingsForm({
  schedulingEnabled = true
}: {
  schedulingEnabled?: boolean;
}) {
  const { data: session, update: updateSession } = useSession();
  const {
    profile,
    loading,
    accounts,
    refetchProfile,
    refetchAccounts,
    profileDataUpdatedAt,
    updateProfile
  } = useProfileSettings();
  const [activeTab, setActiveTab] = useState("profile");

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
  const accountsTab = useAccountsTabUi({ accounts, refetchAccounts, updateSession });
  const { unlinkAccountProvider, hasGoogle, onUnlinkAccount, onLinkGoogle } = accountsTab;
  const securityTab = useSecurityTabUi({ submitChangePassword: postChangePassword });

  const clientStatusesTab = useClientStatusesTabUi();
  const { clientStatuses, clientStatusesLoading, refetchClientStatuses } =
    useClientStatusesSettings(activeTab === "statuses");

  useEffect(() => {
    if (!schedulingEnabled && activeTab === "calendar") void (async () => setActiveTab("profile"))();
  }, [schedulingEnabled, activeTab]);

  if (loading) return <SettingsFormLoadingState />;
  if (!profile) return <SettingsFormErrorState variant="network" />;
  if (!profile.user) return <SettingsFormErrorState variant="default" />;

  const { saving, hasProfileChanges, image, initials, alt } = profileTab;
  const {
    profilePhotoPublished,
    publishSaving,
    savingProfessional,
    hasProfessionalChanges,
    bio, setBio,
    specialization, setSpecialization,
    contactPhone, setContactPhone,
    contactTelegram, setContactTelegram,
    contactViber, setContactViber,
    contactWhatsapp, setContactWhatsapp,
    handlePublishProfileChange,
    handleSaveProfessional
  } = professionalTab;

  return (
    <SettingsFormErrorBoundary logPrefix="[PsychologistSettingsForm]">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v ?? "profile")} className="w-full">
        <PsychologistTabsList schedulingEnabled={schedulingEnabled} />

        <TabsContent value="profile" className="mt-4">
          {activeTab === "profile" && (
            <SettingsSection title="Личные данные">
              <ProfileTabPanel
                handleSaveProfile={profileTab.handleSaveProfile}
                saving={saving}
                hasProfileChanges={hasProfileChanges}
                image={image}
                initials={initials}
                alt={alt}
                onAvatarSuccess={() => updateSession?.()}
                firstName={profileTab.firstName}
                setFirstName={profileTab.setFirstName}
                lastName={profileTab.lastName}
                setLastName={profileTab.setLastName}
                email={profileTab.email}
                setEmail={profileTab.setEmail}
                phone={profileTab.phone}
                setPhone={profileTab.setPhone}
                dateOfBirth={profileTab.dateOfBirth}
                dobPopoverOpen={profileTab.dobPopoverOpen}
                setDobPopoverOpen={profileTab.setDobPopoverOpen}
                setDateOfBirth={profileTab.setDateOfBirth}
                gender={profileTab.gender}
                setGender={profileTab.setGender}
                country={profileTab.country}
                setCountry={profileTab.setCountry}
                countryCode={profileTab.countryCode}
                setCountryCode={profileTab.setCountryCode}
                city={profileTab.city}
                setCity={profileTab.setCity}
                maritalStatus={profileTab.maritalStatus}
                setMaritalStatus={profileTab.setMaritalStatus}
                maritalOptions={MARITAL_OPTIONS}
              />
            </SettingsSection>
          )}
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          {activeTab === "security" && (
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

        <TabsContent value="customFields" className="mt-4">
          <SettingsSection title="Пользовательские поля клиента">
            <CustomFieldsTabSection enabled={activeTab === "customFields"} />
          </SettingsSection>
        </TabsContent>

        <TabsContent value="statuses" className="mt-4">
          {activeTab === "statuses" && (
            <SettingsSection title="Статусы клиентов">
              <ClientStatusesTabPanel
                clientStatuses={clientStatuses}
                clientStatusesLoading={clientStatusesLoading}
                STATUS_COLOR_PRESETS={clientStatusesTab.STATUS_COLOR_PRESETS}
                addStatusDialogOpen={clientStatusesTab.addStatusDialogOpen}
                setAddStatusDialogOpen={clientStatusesTab.setAddStatusDialogOpen}
                newStatusLabel={clientStatusesTab.newStatusLabel}
                setNewStatusLabel={clientStatusesTab.setNewStatusLabel}
                newStatusColor={clientStatusesTab.newStatusColor}
                setNewStatusColor={clientStatusesTab.setNewStatusColor}
                editingStatusId={clientStatusesTab.editingStatusId}
                setEditingStatusId={clientStatusesTab.setEditingStatusId}
                editingStatusLabel={clientStatusesTab.editingStatusLabel}
                setEditingStatusLabel={clientStatusesTab.setEditingStatusLabel}
                editingStatusColor={clientStatusesTab.editingStatusColor}
                setEditingStatusColor={clientStatusesTab.setEditingStatusColor}
                refetchClientStatuses={refetchClientStatuses}
              />
            </SettingsSection>
          )}
        </TabsContent>

        {schedulingEnabled && (
          <TabsContent value="calendar" className="mt-4">
            {activeTab === "calendar" && (
              <SettingsSection title="Подписаться на календарь">
                <CalendarSubscriptionBlock />
              </SettingsSection>
            )}
          </TabsContent>
        )}

        <TabsContent value="professional" className="mt-4">
          {activeTab === "professional" && (
            <SettingsSection title="Профессиональный профиль">
              <ProfessionalTabPanel
                schedulingEnabled={schedulingEnabled}
                profilePhotoUrl={profile.psychologistProfile?.profilePhotoUrl ?? null}
                profilePhotoPublished={profilePhotoPublished}
                initials={initials}
                alt={alt || "Психолог"}
                publishSaving={publishSaving}
                onPublishChange={handlePublishProfileChange}
                onSuccess={() => void refetchProfile()}
                handleSaveProfessional={handleSaveProfessional}
                savingProfessional={savingProfessional}
                hasProfessionalChanges={hasProfessionalChanges}
                bio={bio}
                setBio={setBio}
                BIO_MAX_LENGTH={BIO_MAX_LENGTH}
                specialization={specialization}
                setSpecialization={setSpecialization}
                PROFESSION_OPTIONS={PROFESSION_OPTIONS}
                contactPhone={contactPhone}
                setContactPhone={setContactPhone}
                contactTelegram={contactTelegram}
                setContactTelegram={setContactTelegram}
                contactViber={contactViber}
                setContactViber={setContactViber}
                contactWhatsapp={contactWhatsapp}
                setContactWhatsapp={setContactWhatsapp}
              />
            </SettingsSection>
          )}
        </TabsContent>
      </Tabs>
    </SettingsFormErrorBoundary>
  );
}
