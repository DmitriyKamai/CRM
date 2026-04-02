import { signOut } from "next-auth/react";

import type { UserSettingsProfile } from "@/lib/user-settings/types";

export async function fetchUserSettingsProfile(): Promise<UserSettingsProfile> {
  const res = await fetch("/api/user/profile");
  if (res.status === 401) {
    await signOut({ callbackUrl: "/auth/login" });
    throw new Error("unauthorized");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Не удалось загрузить профиль");
  }
  return res.json() as Promise<UserSettingsProfile>;
}
