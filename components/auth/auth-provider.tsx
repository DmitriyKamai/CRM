"use client";

import { SessionProvider } from "next-auth/react";

import { SessionRequiresReauthListener } from "@/components/auth/session-requires-reauth-listener";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
    >
      <SessionRequiresReauthListener />
      {children}
    </SessionProvider>
  );
}

