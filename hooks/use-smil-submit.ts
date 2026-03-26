import { useCallback, useState } from "react";

import type { DiagnosticsVariant } from "@/store/slices/diagnostics-progress.slice";
import type { AnswerValue } from "./use-smil-progress";

export type SmilResult = {
  text: string;
  scores: Record<string, number> | null;
  profileSheet: "male" | "female" | null;
};

export function useSmilSubmit(
  token: string,
  markAsSubmitted: () => void
) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<SmilResult | null>(null);

  const submit = useCallback(
    async (answers: Record<number, AnswerValue>, variant: DiagnosticsVariant) => {
      setSubmitting(true);
      setSubmitError(null);
      try {
        const res = await fetch("/api/diagnostics/smil/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, answers, variant })
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setSubmitError(data?.message ?? "Не удалось сохранить результат");
          return false;
        }
        markAsSubmitted();
        setResult({
          text: data?.interpretation ?? "Результат сохранён.",
          scores: data?.scaleScores ?? null,
          profileSheet:
            data?.profileSheet === "female" || data?.profileSheet === "male"
              ? data.profileSheet
              : null
        });
        return true;
      } catch {
        setSubmitError("Не удалось подключиться к серверу");
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [token, markAsSubmitted]
  );

  return { submit, submitting, submitError, result };
}
