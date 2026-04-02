"use client";

import type { Session } from "next-auth";

import { usePersonalProfileTabUi } from "@/hooks/use-personal-profile-tab-ui";
import { MARITAL_OPTIONS } from "@/lib/settings/marital-options";
import { PersonalProfileSettingsSection } from "@/components/settings/shared/personal-profile-settings-section";

export type PsychologistProfileSettingsTabProps = {
  profileTab: ReturnType<typeof usePersonalProfileTabUi>;
  updateSession?: (data?: unknown) => Promise<Session | null | undefined>;
};

/**
 * Вкладка «Профиль» психолога: личные данные (секция + форма), без оркестрации данных.
 */
export function PsychologistProfileSettingsTab({
  profileTab,
  updateSession
}: PsychologistProfileSettingsTabProps) {
  const { saving, hasProfileChanges, image, initials, alt } = profileTab;

  return (
    <PersonalProfileSettingsSection
      handleSaveProfile={profileTab.handleSaveProfile}
      saving={saving}
      hasProfileChanges={hasProfileChanges}
      image={image}
      initials={initials}
      alt={alt}
      onAvatarSuccess={() => void updateSession?.()}
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
  );
}
