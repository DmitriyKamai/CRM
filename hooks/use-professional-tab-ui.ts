"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { Profile } from "@/hooks/use-profile-settings";
import { patchUserProfile } from "@/lib/user-settings/patch-user-profile";

type Props = {
  profile: Profile | null;
  updateProfileInCache: (updater: (prev: Profile) => Profile) => void;
};

export function useProfessionalTabUi({ profile, updateProfileInCache }: Props) {
  const [savingProfessional, setSavingProfessional] = useState(false);
  const [profilePhotoPublished, setProfilePhotoPublished] = useState(false);
  const [publishSaving, setSavingPublish] = useState(false);

  const [bio, setBio] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactTelegram, setContactTelegram] = useState("");
  const [contactViber, setContactViber] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");

  const [formHydrated, setFormHydrated] = useState(false);
  useEffect(() => {
    if (!profile || formHydrated) return;
    setFormHydrated(true);

    setBio(profile.psychologistProfile?.bio ?? "");
    setSpecialization(profile.psychologistProfile?.specialization ?? "");
    setContactPhone(profile.psychologistProfile?.contactPhone ?? "");
    setContactTelegram(profile.psychologistProfile?.contactTelegram ?? "");
    setContactViber(profile.psychologistProfile?.contactViber ?? "");
    setContactWhatsapp(profile.psychologistProfile?.contactWhatsapp ?? "");
    setProfilePhotoPublished(profile.psychologistProfile?.profilePhotoPublished ?? false);
  }, [profile, formHydrated]);

  async function handlePublishProfileChange(published: boolean) {
    setSavingPublish(true);
    try {
      await patchUserProfile({ profilePhotoPublished: published });

      setProfilePhotoPublished(published);
      updateProfileInCache((prev) =>
        prev?.psychologistProfile
          ? {
              ...prev,
              psychologistProfile: {
                ...prev.psychologistProfile,
                profilePhotoUrl: prev.psychologistProfile.profilePhotoUrl ?? null,
                profilePhotoPublished: published
              }
            }
          : prev
      );
      toast.success(published ? "Профиль опубликован" : "Профиль снят с публикации");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSavingPublish(false);
    }
  }

  async function handleSaveProfessional(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setSavingProfessional(true);
    try {
      await patchUserProfile({
        bio: bio.trim() || null,
        specialization: specialization || null,
        contactPhone: contactPhone.trim() || null,
        contactTelegram: contactTelegram.trim() || null,
        contactViber: contactViber.trim() || null,
        contactWhatsapp: contactWhatsapp.trim() || null
      });

      toast.success("Сохранено");
      updateProfileInCache((prev) => ({
        ...prev,
        psychologistProfile: prev.psychologistProfile
          ? {
              ...prev.psychologistProfile,
              bio: bio.trim() || null,
              specialization: specialization || null,
              profilePhotoUrl: prev.psychologistProfile.profilePhotoUrl ?? null,
              profilePhotoPublished: prev.psychologistProfile.profilePhotoPublished,
              contactPhone: contactPhone.trim() || null,
              contactTelegram: contactTelegram.trim() || null,
              contactViber: contactViber.trim() || null,
              contactWhatsapp: contactWhatsapp.trim() || null
            }
          : prev.psychologistProfile
      }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSavingProfessional(false);
    }
  }

  const savedBio = profile?.psychologistProfile?.bio ?? "";
  const savedSpecialization = profile?.psychologistProfile?.specialization ?? "";
  const savedContactPhone = profile?.psychologistProfile?.contactPhone ?? "";
  const savedContactTelegram = profile?.psychologistProfile?.contactTelegram ?? "";
  const savedContactViber = profile?.psychologistProfile?.contactViber ?? "";
  const savedContactWhatsapp = profile?.psychologistProfile?.contactWhatsapp ?? "";

  const hasProfessionalChanges =
    (bio.trim() || "") !== (savedBio || "") ||
    (specialization || "") !== (savedSpecialization || "") ||
    (contactPhone.trim() || "") !== (savedContactPhone || "") ||
    (contactTelegram.trim() || "") !== (savedContactTelegram || "") ||
    (contactViber.trim() || "") !== (savedContactViber || "") ||
    (contactWhatsapp.trim() || "") !== (savedContactWhatsapp || "");

  return {
    // Для верстки/UX
    profilePhotoPublished,
    publishSaving,

    savingProfessional,
    hasProfessionalChanges,

    // Данные формы
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

    // Обработчики
    handleSaveProfessional,
    handlePublishProfileChange
  };
}

