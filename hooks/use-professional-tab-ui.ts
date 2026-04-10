"use client";

import { useEffect, useState } from "react";
import { useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";

import type { Profile } from "@/hooks/use-user-settings";
import { getCountryCodeByName } from "@/lib/data/countries-ru";
import { userSettingsKeys } from "@/lib/query-keys/user-settings";
import { patchUserProfile } from "@/lib/user-settings/patch-user-profile";
import {
  normalizePublicSlugInput,
  validatePublicSlug
} from "@/lib/settings/public-profile-slug";

type UpdateSessionFn = (() => unknown) | undefined;

type Props = {
  profile: Profile | null;
  profileSyncVersion: number;
  updateSession?: UpdateSessionFn;
  patchProfile: UseMutationResult<unknown, Error, object>;
};

export function useProfessionalTabUi({
  profile,
  profileSyncVersion,
  updateSession,
  patchProfile
}: Props) {
  const queryClient = useQueryClient();
  const [profilePagePublished, setProfilePagePublished] = useState(false);
  const [catalogVisible, setCatalogVisible] = useState(false);
  const [visibilitySaving, setVisibilitySaving] = useState(false);

  const [publicSlug, setPublicSlug] = useState("");
  const [bio, setBio] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactTelegram, setContactTelegram] = useState("");
  const [contactViber, setContactViber] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [practiceCountry, setPracticeCountry] = useState("");
  const [practiceCity, setPracticeCity] = useState("");
  /** ISO кода страны для автодополнения города (как в личном профиле). */
  const [practiceCountryCode, setPracticeCountryCode] = useState<string | null>(null);
  const [worksOnline, setWorksOnline] = useState(false);

  useEffect(() => {
    if (!profile) return;

    setBio(profile.psychologistProfile?.bio ?? "");
    setSpecialization(profile.psychologistProfile?.specialization ?? "");
    setContactPhone(profile.psychologistProfile?.contactPhone ?? "");
    setContactTelegram(profile.psychologistProfile?.contactTelegram ?? "");
    setContactViber(profile.psychologistProfile?.contactViber ?? "");
    setContactWhatsapp(profile.psychologistProfile?.contactWhatsapp ?? "");
    setPublicSlug(profile.psychologistProfile?.publicSlug ?? "");
    setProfilePagePublished(profile.psychologistProfile?.profilePagePublished ?? false);
    setCatalogVisible(profile.psychologistProfile?.catalogVisible ?? false);
    const pc = profile.psychologistProfile?.practiceCountry ?? "";
    setPracticeCountry(pc);
    setPracticeCity(profile.psychologistProfile?.practiceCity ?? "");
    setPracticeCountryCode(pc ? (getCountryCodeByName(pc) ?? null) : null);
    setWorksOnline(profile.psychologistProfile?.worksOnline ?? false);
  }, [profile, profileSyncVersion]);

  async function syncProfileAfterPatch() {
    await queryClient.invalidateQueries({ queryKey: userSettingsKeys.profile() });
    await updateSession?.();
  }

  async function handleProfilePagePublishedChange(published: boolean) {
    if (visibilitySaving) return;

    let validatedSlug: string | undefined;
    if (published) {
      const normalized = normalizePublicSlugInput(publicSlug);
      if (normalized.length > 0) {
        const checked = validatePublicSlug(normalized);
        if (!checked.ok) {
          toast.error(checked.message);
          return;
        }
        validatedSlug = checked.slug;
      }
    }

    setVisibilitySaving(true);
    try {
      const body: Record<string, unknown> = { profilePagePublished: published };
      if (published && validatedSlug !== undefined) {
        body.publicSlug = validatedSlug;
      }
      await patchUserProfile(body);
      await syncProfileAfterPatch();
      setProfilePagePublished(published);
      if (!published) setCatalogVisible(false);
      toast.success(published ? "Страница опубликована" : "Страница снята с публикации");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setVisibilitySaving(false);
    }
  }

  async function handleCatalogVisibleChange(visible: boolean) {
    if (visibilitySaving) return;
    const pageOn =
      profilePagePublished || profile?.psychologistProfile?.profilePagePublished;
    if (visible && !pageOn) {
      toast.error("Сначала опубликуйте страницу профиля");
      return;
    }
    setVisibilitySaving(true);
    try {
      await patchUserProfile({ catalogVisible: visible });
      await syncProfileAfterPatch();
      setCatalogVisible(visible);
      toast.success(visible ? "Профиль в каталоге" : "Скрыто из каталога");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setVisibilitySaving(false);
    }
  }

  async function handleSaveProfessional(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    const slugNorm = normalizePublicSlugInput(publicSlug);
    let slugOut: string | null = null;
    if (slugNorm.length > 0) {
      const checked = validatePublicSlug(slugNorm);
      if (!checked.ok) {
        toast.error(checked.message);
        return;
      }
      slugOut = checked.slug;
    }

    await patchProfile.mutateAsync({
      bio: bio.trim() || null,
      specialization: specialization || null,
      contactPhone: contactPhone.trim() || null,
      contactTelegram: contactTelegram.trim() || null,
      contactViber: contactViber.trim() || null,
      contactWhatsapp: contactWhatsapp.trim() || null,
      publicSlug: slugOut,
      practiceCountry: practiceCountry.trim() || null,
      practiceCity: practiceCity.trim() || null,
      worksOnline
    });
  }

  const savedBio = profile?.psychologistProfile?.bio ?? "";
  const savedSpecialization = profile?.psychologistProfile?.specialization ?? "";
  const savedContactPhone = profile?.psychologistProfile?.contactPhone ?? "";
  const savedContactTelegram = profile?.psychologistProfile?.contactTelegram ?? "";
  const savedContactViber = profile?.psychologistProfile?.contactViber ?? "";
  const savedContactWhatsapp = profile?.psychologistProfile?.contactWhatsapp ?? "";
  const savedSlug = profile?.psychologistProfile?.publicSlug ?? "";
  const savedPracticeCountry = profile?.psychologistProfile?.practiceCountry ?? "";
  const savedPracticeCity = profile?.psychologistProfile?.practiceCity ?? "";
  const savedWorksOnline = profile?.psychologistProfile?.worksOnline ?? false;

  const hasProfessionalChanges =
    (bio.trim() || "") !== (savedBio || "") ||
    (specialization || "") !== (savedSpecialization || "") ||
    (contactPhone.trim() || "") !== (savedContactPhone || "") ||
    (contactTelegram.trim() || "") !== (savedContactTelegram || "") ||
    (contactViber.trim() || "") !== (savedContactViber || "") ||
    (contactWhatsapp.trim() || "") !== (savedContactWhatsapp || "") ||
    normalizePublicSlugInput(publicSlug) !== normalizePublicSlugInput(savedSlug) ||
    (practiceCountry.trim() || "") !== (savedPracticeCountry || "") ||
    (practiceCity.trim() || "") !== (savedPracticeCity || "") ||
    worksOnline !== savedWorksOnline;

  return {
    profilePagePublished,
    catalogVisible,
    visibilitySaving,

    savingProfessional: patchProfile.isPending,
    hasProfessionalChanges,

    publicSlug,
    setPublicSlug,
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
    practiceCountry,
    setPracticeCountry,
    practiceCity,
    setPracticeCity,
    practiceCountryCode,
    setPracticeCountryCode,
    worksOnline,
    setWorksOnline,

    handleSaveProfessional,
    handleProfilePagePublishedChange,
    handleCatalogVisibleChange
  };
}
