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

/**
 * Единый хук состояния формы личных данных для любой роли (клиент и психолог).
 * Все поля читаются только из profile.user — дублирования нет.
 */
export function usePersonalProfileTabUi({ profile, session, patchProfile, profileSyncVersion }: Props) {
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
    const u = profile.user;

    // firstName/lastName: отдельные поля или парсинг из name
    const parts = (u.name ?? "").trim().split(/\s+/).filter(Boolean);
    setFirstName(u.firstName ?? parts[0] ?? "");
    setLastName(u.lastName ?? parts.slice(1).join(" ") ?? "");

    setEmail(u.email ?? "");
    setPhone(u.phone ?? "");
    setDateOfBirth(u.dateOfBirth ?? "");

    const userCountry = u.country ?? "";
    setCountry(userCountry || DEFAULT_COUNTRY_NAME);
    setCity(u.city ?? "");
    setGender(u.gender ?? "");
    setMaritalStatus(u.maritalStatus ?? "");

    setCountryCode(
      userCountry
        ? getCountryCodeByName(userCountry) ?? null
        : DEFAULT_COUNTRY_CODE
    );
  }, [profile, profileSyncVersion]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const name = session?.user?.name ?? "";
  const image = session?.user?.image ?? null;
  const displayEmail = (email || profile?.user?.email) ?? "";

  const initials =
    [firstName, lastName].filter(Boolean).join(" ") || name || displayEmail.slice(0, 2) || "";

  const u = profile?.user;
  const parts = (u?.name ?? "").trim().split(/\s+/).filter(Boolean);
  const savedFirstName = u?.firstName ?? parts[0] ?? "";
  const savedLastName = u?.lastName ?? parts.slice(1).join(" ") ?? "";
  const savedEmail = u?.email ?? "";
  const savedPhone = u?.phone ?? "";
  const savedDateOfBirth = u?.dateOfBirth ?? "";
  const savedCountry = u?.country ?? "";
  const savedCity = u?.city ?? "";
  const savedGender = u?.gender ?? "";
  const savedMaritalStatus = u?.maritalStatus ?? "";

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
      firstName: firstName.trim() || null,
      lastName: lastName.trim() || null,
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
