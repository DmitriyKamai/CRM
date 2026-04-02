"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { User, Lock, Link2, CalendarDays, Briefcase, ListChecks, ListFilter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MARITAL_OPTIONS } from "@/lib/settings/marital-options";
import { BIO_MAX_LENGTH, PROFESSION_OPTIONS } from "@/lib/settings/professional-profile";
import { SettingsSection } from "@/components/settings/shared/settings-section";
import { SettingsFormErrorBoundary } from "@/components/settings/shared/settings-form-error-boundary";
import { SettingsSecurityTab } from "@/components/settings/shared/settings-security-tab";
import { SettingsAccountsTab } from "@/components/settings/shared/settings-accounts-tab";
const CalendarSubscriptionBlock = dynamic(
  () => import("@/components/schedule/calendar-subscription").then((m) => ({ default: m.CalendarSubscriptionBlock })),
  { ssr: false }
);
const TelegramAccountBlock = dynamic(
  () => import("@/components/account/telegram-account-block").then((m) => ({ default: m.TelegramAccountBlock })),
  { ssr: false }
);
import { useProfileSettings } from "@/hooks/use-profile-settings";
import { useProfileTabUi } from "@/hooks/use-profile-tab-ui";
import { useProfessionalTabUi } from "@/hooks/use-professional-tab-ui";
import { useSecurityTabUi } from "@/hooks/use-security-tab-ui";
import { CustomFieldsTabSection } from "@/components/psychologist/settings/custom-fields-tab-section";
import { useClientStatusesSettings } from "@/hooks/use-client-statuses-settings";
import { useClientStatusesTabUi } from "@/hooks/use-client-statuses-tab-ui";
import { CalendarFeedTokenRotateSection } from "@/components/psychologist/settings/calendar-feed-token-rotate-section";
import { ClientStatusesTabPanel } from "@/components/psychologist/settings/client-statuses-tab-panel";
import { ProfessionalTabPanel } from "@/components/psychologist/settings/professional-tab-panel";
import { ProfileTabPanel } from "@/components/psychologist/settings/profile-tab-panel";
import { useAccountsTabUi } from "@/hooks/use-accounts-tab-ui";

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
    updateProfileInCache
  } = useProfileSettings();
  const [activeTab, setActiveTab] = useState("profile");

  const profileTab = useProfileTabUi({
    profile,
    session,
    updateSession,
    updateProfileInCache
  });

  const professionalTab = useProfessionalTabUi({
    profile,
    updateProfileInCache
  });
  const accountsTab = useAccountsTabUi({
    accounts,
    refetchAccounts,
    updateSession
  });
  const { unlinkAccountProvider, hasGoogle, onUnlinkAccount, onLinkGoogle } = accountsTab;
  const securityTab = useSecurityTabUi({
    submitChangePassword: async (body) => {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { message?: string }).message ?? "Не удалось сменить пароль");
      }
    }
  });

  const clientStatusesTab = useClientStatusesTabUi();
  const {
    clientStatuses,
    clientStatusesLoading,
    refetchClientStatuses
  } = useClientStatusesSettings(activeTab === "statuses");
  const {
    STATUS_COLOR_PRESETS,
    addStatusDialogOpen,
    setAddStatusDialogOpen,
    newStatusLabel,
    setNewStatusLabel,
    newStatusColor,
    setNewStatusColor,
    editingStatusId,
    setEditingStatusId,
    editingStatusLabel,
    setEditingStatusLabel,
    editingStatusColor,
    setEditingStatusColor
  } = clientStatusesTab;

  useEffect(() => {
    if (!schedulingEnabled && activeTab === "calendar") void (async () => setActiveTab("profile"))();
  }, [schedulingEnabled, activeTab]);

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-8">
        Загрузка настроек…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-sm text-muted-foreground py-8">
        Не удалось загрузить настройки. Проверьте подключение и обновите страницу.
      </div>
    );
  }

  if (!profile.user) {
    return (
      <div className="text-sm text-muted-foreground py-8">
        Не удалось загрузить настройки. Обновите страницу.
      </div>
    );
  }

  const { saving, hasProfileChanges, image, initials, alt } = profileTab;
  const {
    profilePhotoPublished,
    publishSaving,
    savingProfessional,
    hasProfessionalChanges,
    bio,
    setBio,
    specialization,
    setSpecialization,
    contactPhone,
    setContactPhone,
    contactTelegram,
    setContactTelegram,
    contactViber,
    setContactViber,
    contactWhatsapp,
    setContactWhatsapp,
    handlePublishProfileChange,
    handleSaveProfessional
  } = professionalTab;

  return (
    <SettingsFormErrorBoundary logPrefix="[PsychologistSettingsForm]">
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v ?? "profile")} className="w-full">
      <TabsList className="flex h-auto w-full min-w-0 flex-wrap justify-center gap-1 rounded-lg bg-muted/80 p-1 sm:justify-start lg:gap-1.5 lg:p-1.5">
        <TabsTrigger
          value="profile"
          className="flex shrink-0 items-center gap-1.5 whitespace-normal px-2.5 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
        >
          <User className="h-4 w-4 shrink-0" />
          <span className="text-left leading-tight">Личные данные</span>
        </TabsTrigger>
        <TabsTrigger
          value="professional"
          className="flex shrink-0 items-center gap-1.5 whitespace-normal px-2.5 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
        >
          <Briefcase className="h-4 w-4 shrink-0" />
          <span className="text-left leading-tight">Профиль</span>
        </TabsTrigger>
        <TabsTrigger
          value="security"
          className="flex shrink-0 items-center gap-1.5 whitespace-normal px-2.5 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
        >
          <Lock className="h-4 w-4 shrink-0" />
          <span className="text-left leading-tight">Безопасность</span>
        </TabsTrigger>
        <TabsTrigger
          value="accounts"
          className="flex shrink-0 items-center gap-1.5 whitespace-normal px-2.5 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
        >
          <Link2 className="h-4 w-4 shrink-0" />
          <span className="text-left leading-tight">Аккаунты</span>
        </TabsTrigger>
        {schedulingEnabled && (
          <TabsTrigger
            value="calendar"
            className="flex shrink-0 items-center gap-1.5 whitespace-normal px-2.5 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
          >
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span className="text-left leading-tight">Календарь</span>
          </TabsTrigger>
        )}
        <TabsTrigger
          value="customFields"
          className="flex max-w-full min-w-0 shrink-0 items-center gap-1.5 whitespace-normal px-2.5 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
        >
          <ListChecks className="h-4 w-4 shrink-0" />
          <span className="min-w-0 text-left leading-tight">Поля клиента</span>
        </TabsTrigger>
        <TabsTrigger
          value="statuses"
          className="flex max-w-full min-w-0 shrink-0 items-center gap-1.5 whitespace-normal px-2.5 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
        >
          <ListFilter className="h-4 w-4 shrink-0" />
          <span className="min-w-0 text-left leading-tight">Статусы клиентов</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-4">
        {activeTab === "profile" && (
        <>
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
        </>
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
            telegramBlock={<TelegramAccountBlock />}
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
              STATUS_COLOR_PRESETS={STATUS_COLOR_PRESETS}

              addStatusDialogOpen={addStatusDialogOpen}
              setAddStatusDialogOpen={setAddStatusDialogOpen}
              newStatusLabel={newStatusLabel}
              setNewStatusLabel={setNewStatusLabel}
              newStatusColor={newStatusColor}
              setNewStatusColor={setNewStatusColor}

              editingStatusId={editingStatusId}
              setEditingStatusId={setEditingStatusId}
              editingStatusLabel={editingStatusLabel}
              setEditingStatusLabel={setEditingStatusLabel}
              editingStatusColor={editingStatusColor}
              setEditingStatusColor={setEditingStatusColor}

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
