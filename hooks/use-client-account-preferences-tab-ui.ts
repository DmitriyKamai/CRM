"use client";

import { useEffect, useState } from "react";
import type { UseMutationResult } from "@tanstack/react-query";

import type { UserSettingsProfile } from "@/lib/user-settings/types";

type Props = {
  profile: UserSettingsProfile | null;
  patchProfile: UseMutationResult<unknown, Error, object>;
  profileSyncVersion: number;
};

/**
 * Состояние вкладки «Предпочтения» клиента (ClientAccountProfile).
 * PATCH отправляет вложенный объект `clientAccountProfile`.
 */
export function useClientAccountPreferencesTabUi({
  profile,
  patchProfile,
  profileSyncVersion
}: Props) {
  const [timezone, setTimezone] = useState("");
  const [locale, setLocale] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [sessionRemindersEnabled, setSessionRemindersEnabled] = useState(true);
  const [marketingEmailsOptIn, setMarketingEmailsOptIn] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- синхронизация с Query после refetch */
  useEffect(() => {
    if (!profile) return;
    const cap = profile.clientAccountProfile;
    if (cap) {
      setTimezone(cap.timezone ?? "");
      setLocale(cap.locale ?? "");
      setPreferredName(cap.preferredName ?? "");
      setSessionRemindersEnabled(cap.sessionRemindersEnabled);
      setMarketingEmailsOptIn(cap.marketingEmailsOptIn);
    } else {
      setTimezone("");
      setLocale("");
      setPreferredName("");
      setSessionRemindersEnabled(true);
      setMarketingEmailsOptIn(false);
    }
  }, [profile, profileSyncVersion]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const s = profile?.clientAccountProfile;
  const savedTz = (s?.timezone ?? "").trim();
  const savedLocale = s?.locale ?? "";
  const savedPreferred = (s?.preferredName ?? "").trim();
  const savedReminders = s?.sessionRemindersEnabled ?? true;
  const savedMarketing = s?.marketingEmailsOptIn ?? false;

  const hasChanges =
    timezone.trim() !== savedTz ||
    locale !== savedLocale ||
    preferredName.trim() !== savedPreferred ||
    sessionRemindersEnabled !== savedReminders ||
    marketingEmailsOptIn !== savedMarketing;

  async function handleSavePreferences(e: React.FormEvent) {
    e.preventDefault();
    await patchProfile.mutateAsync({
      clientAccountProfile: {
        timezone: timezone.trim() || null,
        locale: locale.trim() || null,
        preferredName: preferredName.trim() || null,
        sessionRemindersEnabled,
        marketingEmailsOptIn
      }
    });
  }

  return {
    handleSavePreferences,
    saving: patchProfile.isPending,
    hasChanges,
    timezone,
    setTimezone,
    locale,
    setLocale,
    preferredName,
    setPreferredName,
    sessionRemindersEnabled,
    setSessionRemindersEnabled,
    marketingEmailsOptIn,
    setMarketingEmailsOptIn
  };
}
