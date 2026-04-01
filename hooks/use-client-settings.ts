"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";

import { clientSettingsKeys } from "@/lib/query-keys/client-settings";

export type ClientSettingsProfile = {
  user: {
    name: string | null;
    email: string;
    image: string | null;
    dateOfBirth: string | null;
    role: string;
    phone?: string | null;
    country?: string | null;
    city?: string | null;
    gender?: string | null;
    maritalStatus?: string | null;
  };
};

export type ClientSettingsAccount = { provider: string; label: string };

async function fetchProfile(): Promise<ClientSettingsProfile> {
  const r = await fetch("/api/user/profile");
  if (r.status === 401) {
    await signOut({ callbackUrl: "/auth/login" });
    throw new Error("unauthorized");
  }
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Ошибка загрузки профиля");
  }
  return r.json() as Promise<ClientSettingsProfile>;
}

async function fetchAccounts(): Promise<{ accounts: ClientSettingsAccount[] }> {
  const r = await fetch("/api/user/accounts");
  if (!r.ok) {
    return { accounts: [] };
  }
  return r.json() as Promise<{ accounts: ClientSettingsAccount[] }>;
}

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

async function patchProfile(body: PatchClientProfileBody): Promise<void> {
  const res = await fetch("/api/user/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { message?: string }).message ?? "Не удалось сохранить");
  }
}

async function postChangePassword(body: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const res = await fetch("/api/user/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { message?: string }).message ?? "Не удалось сменить пароль");
  }
}

async function deleteLinkedAccount(provider: "google" | "apple"): Promise<void> {
  const res = await fetch(`/api/user/accounts?provider=${provider}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { message?: string }).message ?? "Не удалось отвязать");
  }
}

/**
 * Данные и мутации экрана настроек клиента: профиль, аккаунты, сохранение, пароль, отвязка OAuth.
 */
export function useClientSettings() {
  const queryClient = useQueryClient();
  const { update: updateSession } = useSession();

  const profileQuery = useQuery({
    queryKey: clientSettingsKeys.profile(),
    queryFn: fetchProfile,
    refetchOnWindowFocus: false
  });

  const accountsQuery = useQuery({
    queryKey: clientSettingsKeys.accounts(),
    queryFn: fetchAccounts,
    refetchOnWindowFocus: false
  });

  const updateProfileMutation = useMutation({
    mutationFn: patchProfile,
    onSuccess: async () => {
      toast.success("Сохранено");
      await queryClient.invalidateQueries({ queryKey: clientSettingsKeys.profile() });
      await updateSession?.();
    },
    onError: (e: Error) => {
      toast.error(e.message);
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: postChangePassword,
    onSuccess: () => {
      toast.success("Пароль изменён");
    },
    onError: (e: Error) => {
      toast.error(e.message);
    }
  });

  const unlinkAccountMutation = useMutation({
    mutationFn: deleteLinkedAccount,
    onSuccess: async (_, provider) => {
      toast.success(provider === "google" ? "Google отвязан" : "Apple отвязан");
      await queryClient.invalidateQueries({ queryKey: clientSettingsKeys.accounts() });
      await updateSession?.();
    },
    onError: (e: Error) => {
      toast.error(e.message);
    }
  });

  const loading = profileQuery.isPending || accountsQuery.isPending;
  const profile = profileQuery.data ?? null;
  const accounts = accountsQuery.data?.accounts ?? [];

  return {
    profile,
    accounts,
    loading,
    profileError: profileQuery.isError,
    /** Для сброса локального состояния полей профиля после рефетча (без useEffect). */
    profileDataUpdatedAt: profileQuery.dataUpdatedAt,
    updateProfile: updateProfileMutation,
    changePassword: changePasswordMutation,
    unlinkAccount: unlinkAccountMutation
  };
}
