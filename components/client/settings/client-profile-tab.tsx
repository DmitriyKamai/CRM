"use client";

import { useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import type { UseMutationResult } from "@tanstack/react-query";
import { getCountryCodeByName } from "@/lib/data/countries-ru";
import {
  type ClientSettingsProfile,
  type PatchClientProfileBody
} from "@/hooks/use-client-settings";
import { MARITAL_OPTIONS } from "@/lib/settings/marital-options";
import { SettingsSection } from "@/components/settings/shared/settings-section";
import { PersonalProfileForm } from "@/components/settings/shared/personal-profile-form";

export function ClientProfileTab({
  profile,
  updateProfile
}: {
  profile: ClientSettingsProfile;
  updateProfile: UseMutationResult<void, Error, PatchClientProfileBody>;
}) {
  const { data: session, update: updateSession } = useSession();
  const [firstName, setFirstName] = useState(() => {
    const parts = (profile.user.name ?? "").trim().split(/\s+/).filter(Boolean);
    return parts[0] ?? "";
  });
  const [lastName, setLastName] = useState(() => {
    const parts = (profile.user.name ?? "").trim().split(/\s+/).filter(Boolean);
    return parts.slice(1).join(" ") ?? "";
  });
  const [email, setEmail] = useState(() => profile.user.email ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(() => profile.user.dateOfBirth ?? "");
  const [dobPopoverOpen, setDobPopoverOpen] = useState(false);
  const [phone, setPhone] = useState(() => profile.user.phone ?? "");
  const [country, setCountry] = useState(() => profile.user.country ?? "");
  const [city, setCity] = useState(() => profile.user.city ?? "");
  const [countryCode, setCountryCode] = useState<string | null>(() =>
    profile.user.country ? getCountryCodeByName(profile.user.country) : null
  );
  const [gender, setGender] = useState(() => profile.user.gender ?? "");
  const [maritalStatus, setMaritalStatus] = useState(() => profile.user.maritalStatus ?? "");

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync({
        name: [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim() || null,
        ...(email.trim() &&
        email.trim().toLowerCase() !== (profile.user.email ?? "").trim().toLowerCase()
          ? { email: email.trim() }
          : {}),
        dateOfBirth: dateOfBirth || null,
        phone: phone.trim() || null,
        country: country.trim() || null,
        city: city.trim() || null,
        gender: gender || null,
        maritalStatus: maritalStatus || null
      });
    } catch {
      /* toast в useClientSettings */
    }
  }

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const displayName = session?.user?.name ?? fullName ?? "";
  const displayEmail = (email || profile.user.email) ?? "";
  const image = session?.user?.image ?? profile.user.image ?? null;
  const initials =
    (fullName || displayName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((s) => s[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || displayEmail.slice(0, 2).toUpperCase() || "?";

  const savedName = (profile.user.name ?? "").trim();
  const hasProfileChanges =
    fullName !== savedName ||
    email.trim().toLowerCase() !== profile.user.email.trim().toLowerCase() ||
    (dateOfBirth || "") !== (profile.user.dateOfBirth ?? "") ||
    (phone.trim() || "") !== (profile.user.phone ?? "").trim() ||
    (country.trim() || "") !== (profile.user.country ?? "").trim() ||
    (city.trim() || "") !== (profile.user.city ?? "").trim() ||
    (gender || "") !== (profile.user.gender ?? "") ||
    (maritalStatus || "") !== (profile.user.maritalStatus ?? "");

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
        handleSaveProfile={handleSaveProfile}
        saving={updateProfile.isPending}
        hasProfileChanges={hasProfileChanges}
        image={image}
        initials={initials}
        alt={displayName}
        onAvatarSuccess={() => updateSession?.()}
        firstName={firstName}
        setFirstName={setFirstName}
        lastName={lastName}
        setLastName={setLastName}
        email={email}
        setEmail={setEmail}
        phone={phone}
        setPhone={setPhone}
        dateOfBirth={dateOfBirth}
        dobPopoverOpen={dobPopoverOpen}
        setDobPopoverOpen={setDobPopoverOpen}
        setDateOfBirth={setDateOfBirth}
        gender={gender}
        setGender={setGender}
        country={country}
        setCountry={setCountry}
        countryCode={countryCode}
        setCountryCode={setCountryCode}
        city={city}
        setCity={setCity}
        maritalStatus={maritalStatus}
        setMaritalStatus={setMaritalStatus}
        maritalOptions={MARITAL_OPTIONS}
      />
    </SettingsSection>
  );
}
