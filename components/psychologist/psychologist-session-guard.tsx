"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

import { signOutIfSessionInvalid } from "@/lib/session-stale-client";

/** Одна проверка при входе в кабинет: JWT есть, а строки в БД после сброса нет — без тостов, сразу выход. */
export function PsychologistSessionGuard() {
  const { status } = useSession();
  const didCheck = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || didCheck.current) return;
    didCheck.current = true;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/profile", { cache: "no-store" });
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        await signOutIfSessionInvalid(res.status, body);
      } catch {
        /* сеть: не разлогиниваем */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status]);

  return null;
}
