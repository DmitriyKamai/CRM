"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LinkedAccount } from "@/lib/settings/linked-account";
import { profileSettingsKeys } from "@/lib/query-keys/profile-settings";

type Profile = {
  user: {
    name: string | null;
    email: string;
    image: string | null;
    dateOfBirth: string | null;
    role: string;
  };
  psychologistProfile: {
    firstName: string;
    lastName: string;
    phone: string | null;
    country: string | null;
    city: string | null;
    gender: string | null;
    maritalStatus: string | null;
    specialization: string | null;
    bio: string | null;
    profilePhotoUrl: string | null;
    profilePhotoPublished: boolean;
    contactPhone: string | null;
    contactTelegram: string | null;
    contactViber: string | null;
    contactWhatsapp: string | null;
  } | null;
};

async function fetchProfile(): Promise<Profile> {
  const res = await fetch("/api/user/profile");
  if (res.status === 401) {
    signOut({ callbackUrl: "/auth/login" });
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error("Не удалось загрузить профиль");
  return res.json();
}

async function fetchAccounts(): Promise<LinkedAccount[]> {
  const res = await fetch("/api/user/accounts");
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({ accounts: [] }));
  return data?.accounts ?? [];
}

export type { Profile };
/** @deprecated Используйте LinkedAccount из lib/settings/linked-account */
export type Account = LinkedAccount;

export function useProfileSettings() {
  const qc = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: profileSettingsKeys.profile(),
    queryFn: fetchProfile,
    staleTime: 2 * 60 * 1000,
    refetchOnReconnect: false
  });

  const { data: accounts = [] } = useQuery({
    queryKey: profileSettingsKeys.accounts(),
    queryFn: fetchAccounts,
    enabled: !!profile,
    staleTime: 10 * 60 * 1000,
    refetchOnReconnect: false
  });

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (profile && !hydrated) void (async () => setHydrated(true))();
  }, [profile, hydrated]);

  function refetchProfile() {
    return qc.invalidateQueries({ queryKey: profileSettingsKeys.profile() });
  }

  function refetchAccounts() {
    return qc.invalidateQueries({ queryKey: profileSettingsKeys.accounts() });
  }

  function updateProfileInCache(updater: (prev: Profile) => Profile) {
    qc.setQueryData<Profile>(profileSettingsKeys.profile(), (prev) =>
      prev ? updater(prev) : prev
    );
  }

  return {
    profile: profile ?? null,
    loading: profileLoading,
    accounts,
    refetchProfile,
    refetchAccounts,
    updateProfileInCache
  };
}
