"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { userSettingsKeys } from "@/lib/query-keys/user-settings";
import type { LinkedAccount } from "@/lib/settings/linked-account";
import { fetchUserSettingsAccounts } from "@/lib/user-settings/fetch-user-accounts";
import { fetchUserSettingsProfile } from "@/lib/user-settings/fetch-user-profile";
import { patchUserProfile } from "@/lib/user-settings/patch-user-profile";
import { postChangePassword } from "@/lib/user-settings/post-change-password";
import type { UserSettingsProfile } from "@/lib/user-settings/types";

export type ClientSettingsProfile = UserSettingsProfile;

export type ClientSettingsAccount = LinkedAccount;

export type PatchClientProfileBody = {
  name: string | null;
  email?: string;
  dateOfBirth: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  gender: string | null;
  maritalStatus: string | null;
};

/**
 * Данные и мутации экрана настроек клиента: профиль, аккаунты, сохранение, смена пароля.
 * Отвязка OAuth — через useAccountsTabUi (как у психолога).
 */
export function useClientSettings() {
  const queryClient = useQueryClient();
  const { update: updateSession } = useSession();

  const profileQuery = useQuery({
    queryKey: userSettingsKeys.profile(),
    queryFn: fetchUserSettingsProfile,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });

  const accountsQuery = useQuery({
    queryKey: userSettingsKeys.accounts(),
    queryFn: fetchUserSettingsAccounts,
    enabled: !!profileQuery.data,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });

  const updateProfileMutation = useMutation({
    mutationFn: (body: PatchClientProfileBody) => patchUserProfile(body),
    onSuccess: async () => {
      toast.success("Сохранено");
      await queryClient.invalidateQueries({ queryKey: userSettingsKeys.profile() });
      await updateSession?.();
    },
    onError: (e: Error) => {
      toast.error(e.message);
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: postChangePassword
  });

  const loading = profileQuery.isPending || accountsQuery.isPending;
  const profile = profileQuery.data ?? null;
  const accounts = accountsQuery.data ?? [];

  function refetchAccounts() {
    return queryClient.invalidateQueries({ queryKey: userSettingsKeys.accounts() });
  }

  return {
    profile,
    accounts,
    refetchAccounts,
    loading,
    profileError: profileQuery.isError,
    /** Для сброса локального состояния полей профиля после рефетча (без useEffect). */
    profileDataUpdatedAt: profileQuery.dataUpdatedAt,
    updateProfile: updateProfileMutation,
    changePassword: changePasswordMutation
  };
}
