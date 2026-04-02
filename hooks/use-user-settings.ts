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
 * Единый хук экрана настроек: Query и мутации.
 * PATCH профиля через `updateProfile` → тост «Сохранено», invalidate профиля, обновление сессии.
 */
export function useUserSettings(options: { variant: UserSettingsVariant }) {
  const queryClient = useQueryClient();
  const { update: updateSession } = useSession();
  const { profileQuery, accountsQuery } = useUserSettingsQueries();

  const updateProfileMutation = useMutation({
    mutationFn: (body: object) => patchUserProfile(body),
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

  return {
    profile,
    accounts,
    loading,
    profileError: profileQuery.isError,
    profileDataUpdatedAt: profileQuery.dataUpdatedAt,
    updateProfile: updateProfileMutation,
    changePassword: changePasswordMutation,
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
