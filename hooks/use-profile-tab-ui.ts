"use client";

import { useEffect, useState } from "react";
import type { UseMutationResult } from "@tanstack/react-query";

import type { Profile } from "@/hooks/use-user-settings";
import { DEFAULT_COUNTRY_CODE, DEFAULT_COUNTRY_NAME, getCountryCodeByName } from "@/lib/data/countries-ru";

type SessionLike = {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
} | null;

type Props = {
  profile: Profile | null;
  session: SessionLike;
  patchProfile: UseMutationResult<unknown, Error, object>;
  profileSyncVersion: number;
};

export function useProfileTabUi({ profile, session, patchProfile, profileSyncVersion }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [dateOfBirth, setDateOfBirth] = useState("");
  const [dobPopoverOpen, setDobPopoverOpen] = useState(false);

  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [countryCode, setCountryCode] = useState<string | null>(null);

  const [gender, setGender] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect -- синхронизация формы с данными Query после refetch */
  useEffect(() => {
    if (!profile) return;

    setFirstName(profile.psychologistProfile?.firstName ?? profile.user?.name ?? "");
    setLastName(profile.psychologistProfile?.lastName ?? "");
    setEmail(profile.user?.email ?? "");
    setPhone(profile.psychologistProfile?.phone ?? "");
    setDateOfBirth(profile.user?.dateOfBirth ?? "");
    setCountry(profile.psychologistProfile?.country ?? DEFAULT_COUNTRY_NAME);
    setCity(profile.psychologistProfile?.city ?? "");
    setGender(profile.psychologistProfile?.gender ?? "");
    setMaritalStatus(profile.psychologistProfile?.maritalStatus ?? "");

    setCountryCode(
      profile.psychologistProfile?.country
        ? getCountryCodeByName(profile.psychologistProfile.country) ?? null
        : DEFAULT_COUNTRY_CODE
    );
  }, [profile, profileSyncVersion]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const name = session?.user?.name ?? "";
  const image = session?.user?.image ?? null;
  const displayEmail = (email || profile?.user?.email) ?? "";

  const initials =
    [firstName, lastName].filter(Boolean).join(" ") || name || displayEmail.slice(0, 2) || "";

  const savedFirstName = profile?.psychologistProfile?.firstName ?? profile?.user?.name ?? "";
  const savedLastName = profile?.psychologistProfile?.lastName ?? "";
  const savedEmail = profile?.user?.email ?? "";
  const savedPhone = profile?.psychologistProfile?.phone ?? "";
  const savedDateOfBirth = profile?.user?.dateOfBirth ?? "";
  const savedCountry = profile?.psychologistProfile?.country ?? "";
  const savedCity = profile?.psychologistProfile?.city ?? "";
  const savedGender = profile?.psychologistProfile?.gender ?? "";
  const savedMaritalStatus = profile?.psychologistProfile?.maritalStatus ?? "";

  const hasProfileChanges =
    firstName !== savedFirstName ||
    lastName !== savedLastName ||
    email.trim().toLowerCase() !== savedEmail.trim().toLowerCase() ||
    (phone.trim() || "") !== (savedPhone || "") ||
    (dateOfBirth || "") !== (savedDateOfBirth || "") ||
    (country.trim() || "") !== (savedCountry || "") ||
    (city.trim() || "") !== (savedCity || "") ||
    (gender || "") !== (savedGender || "") ||
    (maritalStatus || "") !== (savedMaritalStatus || "");

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    await patchProfile.mutateAsync({
      firstName,
      lastName,
      phone: phone.trim() || null,
      country: country.trim() || null,
      city: city.trim() || null,
      gender: gender || null,
      maritalStatus: maritalStatus || null,
      ...(email.trim() &&
      email.trim().toLowerCase() !== (profile.user?.email ?? "").trim().toLowerCase()
        ? { email: email.trim() }
        : {}),
      dateOfBirth: dateOfBirth || null
    });
  }

  return {
    handleSaveProfile,
    saving: patchProfile.isPending,
    hasProfileChanges,

    image,
    initials,
    alt: name,

    firstName,
    lastName,
    email,
    phone,
    dateOfBirth,
    dobPopoverOpen,
    country,
    city,
    countryCode,
    gender,
    maritalStatus,

    setFirstName,
    setLastName,
    setEmail,
    setPhone,
    setDateOfBirth,
    setDobPopoverOpen,
    setCountry,
    setCity,
    setCountryCode,
    setGender,
    setMaritalStatus
  };
}
