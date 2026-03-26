import { useCallback, useState } from "react";

export type DiagnosticResult = {
  text: string;
  scores: Record<string, number> | null;
};

/**
 * Универсальный хук сабмита для простых тестов (Павлова, Шмишек).
 * `extra` позволяет передать дополнительные поля в тело запроса (например, variant для СМИЛ).
 */
export function useDiagnosticSubmit(
  token: string,
  endpoint: string,
  markAsSubmitted: () => void
) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const submit = useCallback(
    async (
      answers: Record<number, number>,
      extra?: Record<string, unknown>
    ): Promise<boolean> => {
      setSubmitting(true);
      setSubmitError(null);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, answers, ...extra })
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setSubmitError(data?.message ?? "Не удалось сохранить результат");
          return false;
        }
        markAsSubmitted();
        setResult({
          text: data?.interpretation ?? "Результат сохранён.",
          scores: data?.scaleScores ?? null
        });
        return true;
      } catch {
        setSubmitError("Не удалось подключиться к серверу");
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [token, endpoint, markAsSubmitted]
  );

  return { submit, submitting, submitError, result };
}
