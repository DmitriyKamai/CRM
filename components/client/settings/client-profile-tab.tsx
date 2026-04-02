"use client";

import { useSession } from "next-auth/react";
import type { UseMutationResult } from "@tanstack/react-query";

import type { ClientSettingsProfile } from "@/hooks/use-client-settings";
import { usePersonalProfileTabUi } from "@/hooks/use-personal-profile-tab-ui";
import { MARITAL_OPTIONS } from "@/lib/settings/marital-options";
import { SettingsSection } from "@/components/settings/shared/settings-section";
import { PersonalProfileForm } from "@/components/settings/shared/personal-profile-form";

export function ClientProfileTab({
  profile,
  updateProfile,
  profileSyncVersion
}: {
  profile: ClientSettingsProfile;
  updateProfile: UseMutationResult<unknown, Error, object>;
  profileSyncVersion?: number;
}) {
  const { data: session, update: updateSession } = useSession();

  const tab = usePersonalProfileTabUi({
    profile,
    session,
    patchProfile: updateProfile,
    profileSyncVersion: profileSyncVersion ?? 0
  });

  return (
    <SettingsSection title="Личные данные">
      <PersonalProfileForm
        formClassName="space-y-5 max-w-2xl"
        fieldIds={{
          firstName: "client-firstName",
          lastName: "client-lastName",
          email: "email",
          phone: "client-settings-phone",
          gender: "client-gender",
          country: "client-settings-country",
          city: "client-settings-city",
          marital: "client-marital"
        }}
        handleSaveProfile={tab.handleSaveProfile}
        saving={tab.saving}
        hasProfileChanges={tab.hasProfileChanges}
        image={tab.image}
        initials={tab.initials}
        alt={tab.alt}
        onAvatarSuccess={() => updateSession?.()}
        firstName={tab.firstName}
        setFirstName={tab.setFirstName}
        lastName={tab.lastName}
        setLastName={tab.setLastName}
        email={tab.email}
        setEmail={tab.setEmail}
        phone={tab.phone}
        setPhone={tab.setPhone}
        dateOfBirth={tab.dateOfBirth}
        dobPopoverOpen={tab.dobPopoverOpen}
        setDobPopoverOpen={tab.setDobPopoverOpen}
        setDateOfBirth={tab.setDateOfBirth}
        gender={tab.gender}
        setGender={tab.setGender}
        country={tab.country}
        setCountry={tab.setCountry}
        countryCode={tab.countryCode}
        setCountryCode={tab.setCountryCode}
        city={tab.city}
        setCity={tab.setCity}
        maritalStatus={tab.maritalStatus}
        setMaritalStatus={tab.setMaritalStatus}
        maritalOptions={MARITAL_OPTIONS}
      />
    </SettingsSection>
  );
}
