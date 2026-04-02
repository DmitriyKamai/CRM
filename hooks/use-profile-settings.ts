"use client";

import { useQueryClient } from "@tanstack/react-query";

import { useUserSettingsQueries } from "@/hooks/use-user-settings-queries";
import { userSettingsKeys } from "@/lib/query-keys/user-settings";
import type { LinkedAccount } from "@/lib/settings/linked-account";
import type { UserSettingsProfile } from "@/lib/user-settings/types";

export type Profile = UserSettingsProfile;
/** @deprecated Используйте LinkedAccount из lib/settings/linked-account */
export type Account = LinkedAccount;

export function useProfileSettings() {
  const qc = useQueryClient();
  const { profileQuery, accountsQuery } = useUserSettingsQueries();

  const profile = profileQuery.data ?? null;
  const accounts = accountsQuery.data ?? [];

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
    profile,
    /** Только профиль: аккаунты подгружаются отдельно и не блокируют экран. */
    loading: profileQuery.isPending,
    accounts,
    refetchProfile,
    refetchAccounts,
    updateProfileInCache
  };
}
