import type { LinkedAccount } from "@/lib/settings/linked-account";

export async function fetchUserSettingsAccounts(): Promise<LinkedAccount[]> {
  const res = await fetch("/api/user/accounts");
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({ accounts: [] }));
  return data?.accounts ?? [];
}
