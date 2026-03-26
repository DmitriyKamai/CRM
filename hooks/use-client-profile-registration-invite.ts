"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";

export function useClientProfileRegistrationInvite(opts: {
  clientId: string;
  hasAccount: boolean;
  getTargetEmail: () => string;
  setError: Dispatch<SetStateAction<string | null>>;
}) {
  const { clientId, hasAccount, getTargetEmail, setError } = opts;

  const sendInvite = useCallback(async () => {
    if (hasAccount) return;
    const targetEmail = getTargetEmail().trim();
    if (!targetEmail) return;

    try {
      const res = await fetch(`/api/psychologist/clients/${clientId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: targetEmail })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          data?.message ??
            "Не удалось отправить приглашение. Проверьте настройки почты на сервере."
        );
        return;
      }
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Не удалось отправить приглашение. Попробуйте позже.");
    }
  }, [clientId, getTargetEmail, hasAccount, setError]);

  return { sendInvite };
}

