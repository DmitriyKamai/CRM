"use client";

import type { ReactNode } from "react";

import { LinkedAccountsTabContent } from "@/components/settings/shared/linked-accounts-tab-content";
import { SettingsSection } from "@/components/settings/shared/settings-section";

export function SettingsAccountsTab({
  hasGoogle,
  unlinkAccountProvider,
  onUnlinkAccount,
  onLinkGoogle,
  telegramBlock
}: {
  hasGoogle: boolean;
  unlinkAccountProvider: "google" | "apple" | null;
  onUnlinkAccount: (provider: "google" | "apple") => Promise<void>;
  onLinkGoogle: () => Promise<void>;
  telegramBlock: ReactNode;
}) {
  return (
    <SettingsSection title="Привязка аккаунтов">
      <LinkedAccountsTabContent
        hasGoogle={hasGoogle}
        unlinkAccountProvider={unlinkAccountProvider}
        onUnlinkAccount={onUnlinkAccount}
        onLinkGoogle={onLinkGoogle}
        telegramBlock={telegramBlock}
      />
    </SettingsSection>
  );
}
