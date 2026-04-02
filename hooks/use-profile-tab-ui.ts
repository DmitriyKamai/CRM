"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { Profile } from "@/hooks/use-profile-settings";
import { DEFAULT_COUNTRY_CODE, DEFAULT_COUNTRY_NAME, getCountryCodeByName } from "@/lib/data/countries-ru";
import { patchUserProfile } from "@/lib/user-settings/patch-user-profile";

type SessionLike = {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
} | null;

type UpdateSessionFn = (() => unknown) | undefined;

type Props = {
  profile: Profile | null;
  session: SessionLike;
  updateSession?: UpdateSessionFn;
  updateProfileInCache: (updater: (prev: Profile) => Profile) => void;
};

export function useProfileTabUi({ profile, session, updateSession, updateProfileInCache }: Props) {
  const [saving, setSaving] = useState(false);
  const [formHydrated, setFormHydrated] = useState(false);

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

  useEffect(() => {
    if (!profile || formHydrated) return;
    setFormHydrated(true);

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
  }, [profile, formHydrated]);

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

    setSaving(true);
    try {
      await patchUserProfile({
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

      toast.success("Сохранено");
      updateSession?.();
      updateProfileInCache((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          email: email.trim() || prev.user.email,
          dateOfBirth: dateOfBirth || null
        },
        psychologistProfile: prev.psychologistProfile
          ? {
              ...prev.psychologistProfile,
              firstName,
              lastName,
              phone: phone.trim() || null,
              country: country.trim() || null,
              city: city.trim() || null,
              gender: gender || null,
              maritalStatus: maritalStatus || null
            }
          : {
              firstName,
              lastName,
              phone: phone.trim() || null,
              country: country.trim() || null,
              city: city.trim() || null,
              gender: gender || null,
              maritalStatus: maritalStatus || null,
              specialization: null,
              bio: null,
              profilePhotoUrl: null,
              profilePhotoPublished: false,
              contactPhone: null,
              contactTelegram: null,
              contactViber: null,
              contactWhatsapp: null
            }
      }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  return {
    // Оркестрация формы
    handleSaveProfile,
    saving,
    hasProfileChanges,

    // Для UI (аватар/подпись)
    image,
    initials,
    alt: name,

    // Текущие значения
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

    // Сеттеры
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

