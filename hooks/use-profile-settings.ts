"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { userSettingsKeys } from "@/lib/query-keys/user-settings";
import type { LinkedAccount } from "@/lib/settings/linked-account";
import { fetchUserSettingsAccounts } from "@/lib/user-settings/fetch-user-accounts";
import { fetchUserSettingsProfile } from "@/lib/user-settings/fetch-user-profile";
import type { UserSettingsProfile } from "@/lib/user-settings/types";

export type Profile = UserSettingsProfile;
/** @deprecated Используйте LinkedAccount из lib/settings/linked-account */
export type Account = LinkedAccount;

export function useProfileSettings() {
  const qc = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: userSettingsKeys.profile(),
    queryFn: fetchUserSettingsProfile,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });

  const { data: accounts = [] } = useQuery({
    queryKey: userSettingsKeys.accounts(),
    queryFn: fetchUserSettingsAccounts,
    enabled: !!profile,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });

  function refetchProfile() {
    return qc.invalidateQueries({ queryKey: userSettingsKeys.profile() });
  }

  function refetchAccounts() {
    return qc.invalidateQueries({ queryKey: userSettingsKeys.accounts() });
  }

  function updateProfileInCache(updater: (prev: Profile) => Profile) {
    qc.setQueryData<Profile>(userSettingsKeys.profile(), (prev) =>
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
