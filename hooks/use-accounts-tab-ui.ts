"use client";

import type { Account } from "@/hooks/use-profile-settings";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

type UpdateSessionFn = (() => unknown) | undefined;

type Props = {
  accounts: Account[];
  refetchAccounts: () => unknown;
  updateSession?: UpdateSessionFn;
};

export function useAccountsTabUi({ accounts, refetchAccounts, updateSession }: Props) {
  const [unlinkAccountProvider, setUnlinkAccountProvider] = useState<"google" | "apple" | null>(null);

  const hasGoogle = accounts.some((a) => a.provider === "google");

  async function handleUnlinkAccount(provider: "google" | "apple") {
    setUnlinkAccountProvider(provider);
    try {
      const res = await fetch(`/api/user/accounts?provider=${provider}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Не удалось отвязать");
        return;
      }
      toast.success(provider === "google" ? "Google отвязан" : "Apple отвязан");
      void refetchAccounts();
      updateSession?.();
    } finally {
      setUnlinkAccountProvider(null);
    }
  }

  async function handleLinkGoogle() {
    await fetch("/api/auth/oauth-link-intent", { method: "POST" });
    await signIn("google", { callbackUrl: "/psychologist/settings" });
  }

  return {
    hasGoogle,
    unlinkAccountProvider,
    onUnlinkAccount: handleUnlinkAccount,
    onLinkGoogle: handleLinkGoogle
  };
}

