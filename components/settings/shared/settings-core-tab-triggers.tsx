"use client";

import { User, Lock, Link2 } from "lucide-react";
import { TabsTrigger } from "@/components/ui/tabs";

const VARIANT_STYLES = {
  client: {
    trigger: "flex items-center gap-2 shrink-0"
  },
  psychologist: {
    trigger:
      "flex shrink-0 items-center gap-1.5 whitespace-normal px-2.5 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
  }
} as const;

function TabLabel({
  variant,
  children
}: {
  variant: "client" | "psychologist";
  children: string;
}) {
  if (variant === "psychologist") {
    return <span className="text-left leading-tight">{children}</span>;
  }
  return <>{children}</>;
}

type Variant = "client" | "psychologist";

export function SettingsProfileTabTrigger({ variant }: { variant: Variant }) {
  const triggerClass = VARIANT_STYLES[variant].trigger;
  return (
    <TabsTrigger value="profile" className={triggerClass}>
      <User className="h-4 w-4 shrink-0" />
      <TabLabel variant={variant}>Личные данные</TabLabel>
    </TabsTrigger>
  );
}

export function SettingsSecurityTabTrigger({ variant }: { variant: Variant }) {
  const triggerClass = VARIANT_STYLES[variant].trigger;
  return (
    <TabsTrigger value="security" className={triggerClass}>
      <Lock className="h-4 w-4 shrink-0" />
      <TabLabel variant={variant}>Безопасность</TabLabel>
    </TabsTrigger>
  );
}

export function SettingsAccountsTabTrigger({ variant }: { variant: Variant }) {
  const triggerClass = VARIANT_STYLES[variant].trigger;
  return (
    <TabsTrigger value="accounts" className={triggerClass}>
      <Link2 className="h-4 w-4 shrink-0" />
      <TabLabel variant={variant}>Аккаунты</TabLabel>
    </TabsTrigger>
  );
}
