"use client";

import { useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";

/**
 * При отзыве сессии в JWT выставляется `session.requiresReauth` — сразу выходим на страницу входа.
 */
export function SessionRequiresReauthListener() {
  const { data: session, status } = useSession();
  const didSignOut = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.requiresReauth || didSignOut.current) {
      return;
    }
    didSignOut.current = true;
    void signOut({ callbackUrl: "/auth/login?reason=session_revoked" });
  }, [session?.requiresReauth, status]);

  return null;
}
