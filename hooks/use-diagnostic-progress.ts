import { useCallback, useEffect, useRef, useState } from "react";

import { saveProgressApi } from "./use-smil-progress";

const PROGRESS_SAVE_DEBOUNCE_MS = 500;

async function fetchSimpleProgress(
  token: string,
  validValues: ReadonlySet<number>
): Promise<{ answers: Record<number, number>; currentStep: number }> {
  const res = await fetch(
    `/api/diagnostics/progress?token=${encodeURIComponent(token)}`
  );
  if (!res.ok) {
    if (res.status === 404 || res.status === 410 || res.status === 409) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message ?? "Ссылка недействительна");
    }
    throw new Error("Не удалось загрузить прогресс");
  }
  const data = await res.json();
  const raw = data.answers && typeof data.answers === "object" ? data.answers : {};
  const answers: Record<number, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    const idx = Number(k);
    if (!Number.isFinite(idx)) continue;
    const num = typeof v === "number" ? v : Number(v);
    if (validValues.has(num)) answers[idx] = num;
  }
  return {
    answers,
    currentStep: typeof data.currentStep === "number" ? Math.max(0, data.currentStep) : 0
  };
}

interface UseDiagnosticProgressOptions {
  token: string;
  totalSteps: number;
  /** Допустимые значения ответов. Массив должен быть стабильной ссылкой (константа вне компонента). */
  validAnswerValues: readonly number[];
}

/**
 * Универсальный хук прогресса для простых тестов (Павлова, Шмишек).
 * Не содержит логики variant/демографии (это специфика СМИЛ).
 */
export function useDiagnosticProgress({
  token,
  totalSteps,
  validAnswerValues
}: UseDiagnosticProgressOptions) {
  const validValuesRef = useRef(new Set(validAnswerValues));

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncSaving, setSyncSaving] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ answers: Record<number, number>; step: number } | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchSimpleProgress(token, validValuesRef.current)
      .then(({ answers: a, currentStep: s }) => {
        if (cancelled) return;
        setAnswers(a);
        setCurrentStep(Math.min(s, totalSteps - 1));
      })
      .catch(e => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "Ошибка загрузки");
      })
      .finally(() => {
        if (!cancelled) setInitialized(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token, totalSteps]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      const pending = pendingRef.current;
      if (pending && !submittedRef.current) {
        saveProgressApi(token, {
          answers: pending.answers,
          currentStep: pending.step
        }).catch(() => {});
      }
    };
  }, [token]);

  const persistProgress = useCallback(
    (nextAnswers: Record<number, number>, nextStep: number) => {
      pendingRef.current = { answers: nextAnswers, step: nextStep };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        const pending = pendingRef.current;
        if (!pending || submittedRef.current) return;
        setSyncSaving(true);
        saveProgressApi(token, { answers: pending.answers, currentStep: pending.step })
          .catch(e => console.error(e))
          .finally(() => setSyncSaving(false));
      }, PROGRESS_SAVE_DEBOUNCE_MS);
    },
    [token]
  );

  const markAsSubmitted = useCallback(() => {
    submittedRef.current = true;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    pendingRef.current = null;
  }, []);

  return {
    answers,
    setAnswers,
    currentStep,
    setCurrentStep,
    initialized,
    loadError,
    syncSaving,
    persistProgress,
    markAsSubmitted
  };
}
