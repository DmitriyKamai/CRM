"use client";

import { useEffect, useState } from "react";
import { useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";

import type { Profile } from "@/hooks/use-user-settings";
import { userSettingsKeys } from "@/lib/query-keys/user-settings";
import { patchUserProfile } from "@/lib/user-settings/patch-user-profile";

type UpdateSessionFn = (() => unknown) | undefined;

type Props = {
  profile: Profile | null;
  profileSyncVersion: number;
  updateSession?: UpdateSessionFn;
  patchProfile: UseMutationResult<unknown, Error, object>;
};

export function useProfessionalTabUi({ profile, profileSyncVersion, updateSession, patchProfile }: Props) {
  const queryClient = useQueryClient();
  const [profilePhotoPublished, setProfilePhotoPublished] = useState(false);
  const [publishSaving, setSavingPublish] = useState(false);

  const [bio, setBio] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactTelegram, setContactTelegram] = useState("");
  const [contactViber, setContactViber] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");

  useEffect(() => {
    if (!profile) return;

    setBio(profile.psychologistProfile?.bio ?? "");
    setSpecialization(profile.psychologistProfile?.specialization ?? "");
    setContactPhone(profile.psychologistProfile?.contactPhone ?? "");
    setContactTelegram(profile.psychologistProfile?.contactTelegram ?? "");
    setContactViber(profile.psychologistProfile?.contactViber ?? "");
    setContactWhatsapp(profile.psychologistProfile?.contactWhatsapp ?? "");
    setProfilePhotoPublished(profile.psychologistProfile?.profilePhotoPublished ?? false);
  }, [profile, profileSyncVersion]);

  async function syncProfileAfterPatch() {
    await queryClient.invalidateQueries({ queryKey: userSettingsKeys.profile() });
    await updateSession?.();
  }

  async function handlePublishProfileChange(published: boolean) {
    setSavingPublish(true);
    try {
      await patchUserProfile({ profilePhotoPublished: published });
      await syncProfileAfterPatch();
      setProfilePhotoPublished(published);
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

    await patchProfile.mutateAsync({
      bio: bio.trim() || null,
      specialization: specialization || null,
      contactPhone: contactPhone.trim() || null,
      contactTelegram: contactTelegram.trim() || null,
      contactViber: contactViber.trim() || null,
      contactWhatsapp: contactWhatsapp.trim() || null
    });
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
    profilePhotoPublished,
    publishSaving,

    savingProfessional: patchProfile.isPending,
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

    handleSaveProfessional,
    handlePublishProfileChange
  };
}
