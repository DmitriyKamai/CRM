"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { useUserSettingsQueries } from "@/hooks/use-user-settings-queries";
import { userSettingsKeys } from "@/lib/query-keys/user-settings";
import type { LinkedAccount } from "@/lib/settings/linked-account";
import { patchUserProfile } from "@/lib/user-settings/patch-user-profile";
import { postChangePassword } from "@/lib/user-settings/post-change-password";
import type { UserSettingsProfile } from "@/lib/user-settings/types";

export type Profile = UserSettingsProfile;
export type ClientSettingsProfile = UserSettingsProfile;
/** @deprecated Используйте LinkedAccount из lib/settings/linked-account */
export type Account = LinkedAccount;
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

export type UserSettingsVariant = "client" | "psychologist";

/**
 * Единый хук данных и действий экрана настроек.
 * - `client`: полный loading (профиль + аккаунты), мутации профиля/пароля, флаги для формы клиента.
 * - `psychologist`: loading только по профилю; плюс ручное обновление кэша и refetch (сохранения в таб-хуках).
 */
export function useUserSettings(options: { variant: UserSettingsVariant }) {
  const queryClient = useQueryClient();
  const { update: updateSession } = useSession();
  const { profileQuery, accountsQuery } = useUserSettingsQueries();

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

  const profile = profileQuery.data ?? null;
  const accounts = accountsQuery.data ?? [];

  const loading =
    options.variant === "client"
      ? profileQuery.isPending || accountsQuery.isPending
      : profileQuery.isPending;

  function refetchAccounts() {
    return queryClient.invalidateQueries({ queryKey: userSettingsKeys.accounts() });
  }

  function refetchProfile() {
    return queryClient.invalidateQueries({ queryKey: userSettingsKeys.profile() });
  }

  function updateProfileInCache(updater: (prev: Profile) => Profile) {
    queryClient.setQueryData<Profile>(userSettingsKeys.profile(), (prev) =>
      prev ? updater(prev) : prev
    );
  }

  return {
    profile,
    accounts,
    loading,
    profileError: profileQuery.isError,
    profileDataUpdatedAt: profileQuery.dataUpdatedAt,
    updateProfile: updateProfileMutation,
    changePassword: changePasswordMutation,
    updateProfileInCache,
    refetchProfile,
    refetchAccounts
  };
}

export function useClientSettings() {
  return useUserSettings({ variant: "client" });
}

export function useProfileSettings() {
  return useUserSettings({ variant: "psychologist" });
}
