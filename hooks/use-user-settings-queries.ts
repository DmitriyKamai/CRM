"use client";

import { useQuery } from "@tanstack/react-query";

import { userSettingsKeys } from "@/lib/query-keys/user-settings";
import type { LinkedAccount } from "@/lib/settings/linked-account";
import { fetchUserSettingsAccounts } from "@/lib/user-settings/fetch-user-accounts";
import { fetchUserSettingsProfile } from "@/lib/user-settings/fetch-user-profile";
import type { UserSettingsProfile } from "@/lib/user-settings/types";

const PROFILE_STALE_MS = 2 * 60 * 1000;
const ACCOUNTS_STALE_MS = 10 * 60 * 1000;

/** Общие запросы профиля и аккаунтов для экрана настроек (клиент и психолог). */
export function useUserSettingsQueries() {
  const profileQuery = useQuery<UserSettingsProfile>({
    queryKey: userSettingsKeys.profile(),
    queryFn: fetchUserSettingsProfile,
    staleTime: PROFILE_STALE_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });

  const accountsQuery = useQuery<LinkedAccount[]>({
    queryKey: userSettingsKeys.accounts(),
    queryFn: fetchUserSettingsAccounts,
    enabled: !!profileQuery.data,
    staleTime: ACCOUNTS_STALE_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });

  return { profileQuery, accountsQuery };
}
