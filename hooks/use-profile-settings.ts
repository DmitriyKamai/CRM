"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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

type Account = { provider: string; label: string };

const PROFILE_KEY = ["user-profile-settings"] as const;
const ACCOUNTS_KEY = ["user-accounts-settings"] as const;

async function fetchProfile(): Promise<Profile> {
  const res = await fetch("/api/user/profile");
  if (res.status === 401) {
    signOut({ callbackUrl: "/auth/login" });
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error("Не удалось загрузить профиль");
  return res.json();
}

async function fetchAccounts(): Promise<Account[]> {
  const res = await fetch("/api/user/accounts");
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({ accounts: [] }));
  return data?.accounts ?? [];
}

export type { Profile, Account };

export function useProfileSettings() {
  const qc = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: PROFILE_KEY,
    queryFn: fetchProfile,
    staleTime: 2 * 60 * 1000,
    refetchOnReconnect: false
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ACCOUNTS_KEY,
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
    return qc.invalidateQueries({ queryKey: PROFILE_KEY });
  }

  function refetchAccounts() {
    return qc.invalidateQueries({ queryKey: ACCOUNTS_KEY });
  }

  function updateProfileInCache(updater: (prev: Profile) => Profile) {
    qc.setQueryData<Profile>(PROFILE_KEY, prev => (prev ? updater(prev) : prev));
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
