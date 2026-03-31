"use client";

import React, { Component, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { User, Lock, Link2, CalendarDays, Briefcase, ListChecks, ListFilter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ActiveSessionsSection } from "@/components/account/active-sessions-section";
import { CalendarFeedTokenRotateSection } from "@/components/psychologist/settings/calendar-feed-token-rotate-section";
import { SecurityTabForm } from "@/components/psychologist/settings/security-tab";
import { AccountsTabContent } from "@/components/psychologist/settings/accounts-tab";
import { ClientStatusesTabPanel } from "@/components/psychologist/settings/client-statuses-tab-panel";
import { ProfessionalTabPanel } from "@/components/psychologist/settings/professional-tab-panel";
import { ProfileTabPanel } from "@/components/psychologist/settings/profile-tab-panel";
import { useAccountsTabUi } from "@/hooks/use-accounts-tab-ui";

const MARITAL_OPTIONS: { value: string; label: string }[] = [
  { value: "single", label: "Не в браке" },
  { value: "married", label: "В браке" },
  { value: "divorced", label: "В разводе" },
  { value: "widowed", label: "Вдовец / Вдова" },
  { value: "unspecified", label: "Не указано" }
];

const PROFESSION_OPTIONS: { value: string; label: string }[] = [
  { value: "psychologist", label: "Психолог" },
  { value: "psychotherapist", label: "Врач-психотерапевт" },
  { value: "psychiatrist", label: "Психиатр" }
];

/** Максимум символов в блоке «О себе» */
const BIO_MAX_LENGTH = 1500;

/** Перехватывает ошибки рендера контента настроек и логирует их. */
class SettingsFormErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, message: (error as Error)?.message ?? String(error) };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("[SettingsForm] render error:", error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-md border border-destructive/60 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Ошибка при отображении формы настроек. Обновите страницу. ({this.state.message})
        </div>
      );
    }
    return this.props.children;
  }
}

function Section({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-w-0 border-border/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 space-y-4">{children}</CardContent>
    </Card>
  );
}

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
  const securityTab = useSecurityTabUi();

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
    <SettingsFormErrorBoundary>
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
        <Section title="Личные данные">
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
        </Section>
        </>
        )}
      </TabsContent>

      <TabsContent value="security" className="mt-4">
        {activeTab === "security" && (
          <div className="space-y-4">
            <Section title="Смена пароля">
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
            </Section>
            {schedulingEnabled && (
              <Section title="Ссылка подписки на календарь">
                <CalendarFeedTokenRotateSection />
              </Section>
            )}
            <Section title="Активные сессии">
              <ActiveSessionsSection active={activeTab === "security"} />
            </Section>
          </div>
        )}
      </TabsContent>

      <TabsContent value="accounts" className="mt-4">
        {activeTab === "accounts" && (
        <Section title="Привязка аккаунтов">
          <AccountsTabContent
            hasGoogle={hasGoogle}
            unlinkAccountProvider={unlinkAccountProvider}
            onUnlinkAccount={onUnlinkAccount}
            onLinkGoogle={onLinkGoogle}
            telegramBlock={<TelegramAccountBlock />}
          />
        </Section>
        )}
      </TabsContent>

      <TabsContent value="customFields" className="mt-4">
        <Section title="Пользовательские поля клиента">
          <CustomFieldsTabSection enabled={activeTab === "customFields"} />
        </Section>
      </TabsContent>

      <TabsContent value="statuses" className="mt-4">
        {activeTab === "statuses" && (
          <Section title="Статусы клиентов">
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
          </Section>
        )}
      </TabsContent>

      {schedulingEnabled && (
        <TabsContent value="calendar" className="mt-4">
          {activeTab === "calendar" && (
            <Section title="Подписаться на календарь">
              <CalendarSubscriptionBlock />
            </Section>
          )}
        </TabsContent>
      )}

      <TabsContent value="professional" className="mt-4">
        {activeTab === "professional" && (
        <Section title="Профессиональный профиль">
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
        </Section>
        )}
      </TabsContent>
    </Tabs>
    </SettingsFormErrorBoundary>
  );
}
