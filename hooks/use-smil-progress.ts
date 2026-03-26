import { useCallback, useEffect, useRef, useState } from "react";

import { useAppDispatch } from "@/store/hooks";
import {
  initSession,
  markSubmitted,
  setSyncError,
  setSyncStatus
} from "@/store/slices/diagnostics-progress.slice";
import type { DiagnosticsVariant } from "@/store/slices/diagnostics-progress.slice";

export type AnswerValue = 0 | 1;

const PROGRESS_SAVE_DEBOUNCE_MS = 500;
const SMIL_QUESTION_COUNT = 566;

function ageFromDateOfBirth(dateOfBirth: string): number | null {
  const d = new Date(dateOfBirth);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 ? age : null;
}

export function resolveSmilVariant(gender: string, age: number): DiagnosticsVariant {
  if (gender === "female") return "female";
  if (gender === "male" && age >= 13 && age <= 15) return "adolescent";
  return "male";
}

async function fetchProgressApi(token: string): Promise<{
  answers: Record<number, AnswerValue>;
  currentStep: number;
  meta: { variant?: string; gender?: string; age?: number } | null;
}> {
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
  const answers: Record<number, AnswerValue> = {};
  for (const [k, v] of Object.entries(raw)) {
    const idx = Number(k);
    if (!Number.isFinite(idx)) continue;
    const num = typeof v === "number" ? v : Number(v);
    if (num === 0 || num === 1) answers[idx] = num as AnswerValue;
  }
  const meta =
    data.meta && typeof data.meta === "object"
      ? (data.meta as { variant?: string; gender?: string; age?: number })
      : null;
  return {
    answers,
    currentStep: typeof data.currentStep === "number" ? Math.max(0, data.currentStep) : 0,
    meta
  };
}

export async function saveProgressApi(
  token: string,
  payload: {
    answers?: Record<number, AnswerValue>;
    currentStep?: number;
    meta?: Record<string, unknown>;
  }
): Promise<void> {
  const res = await fetch("/api/diagnostics/progress", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, ...payload })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? "Не удалось сохранить прогресс");
  }
}

interface UseSmilProgressOptions {
  token: string;
  clientInfo?: { gender?: string | null; dateOfBirth?: string | null } | null;
}

export function useSmilProgress({ token, clientInfo }: UseSmilProgressOptions) {
  const dispatch = useAppDispatch();

  const [initialized, setInitialized] = useState(false);
  const [needDemographics, setNeedDemographics] = useState(true);
  const [initialAnswers, setInitialAnswers] = useState<Record<number, AnswerValue>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  const progressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingProgressRef = useRef<{
    answers: Record<number, AnswerValue>;
    step: number;
  } | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchProgressApi(token)
      .then(({ answers, currentStep: s, meta }) => {
        if (cancelled) return;
        setInitialAnswers(answers);

        const hasVariantFromProgress = !!meta?.variant;
        const gender = clientInfo?.gender ?? meta?.gender;
        const ageFromClient = clientInfo?.dateOfBirth
          ? ageFromDateOfBirth(clientInfo.dateOfBirth)
          : null;
        const age = ageFromClient ?? meta?.age ?? null;

        const variantResolved =
          hasVariantFromProgress ||
          ((gender === "male" || gender === "female") && age != null && age >= 0);
        const needDemo = !variantResolved;
        setNeedDemographics(needDemo);

        let resolvedVariant: DiagnosticsVariant | null = null;
        if (
          hasVariantFromProgress &&
          (meta?.variant === "male" || meta?.variant === "female" || meta?.variant === "adolescent")
        ) {
          resolvedVariant = meta.variant as DiagnosticsVariant;
        } else if (
          variantResolved &&
          (gender === "male" || gender === "female") &&
          age != null
        ) {
          resolvedVariant = resolveSmilVariant(gender, age);
        }

        const maxStep = needDemo
          ? 1 + 1 + SMIL_QUESTION_COUNT - 1
          : 1 + SMIL_QUESTION_COUNT - 1;
        dispatch(
          initSession({
            token,
            variant: resolvedVariant,
            currentStep: Math.min(s, maxStep)
          })
        );
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
  }, [token, clientInfo?.gender, clientInfo?.dateOfBirth, dispatch]);

  useEffect(() => {
    return () => {
      if (progressDebounceRef.current) {
        clearTimeout(progressDebounceRef.current);
        progressDebounceRef.current = null;
      }
      const pending = pendingProgressRef.current;
      if (pending && !submittedRef.current) {
        saveProgressApi(token, {
          answers: pending.answers,
          currentStep: pending.step
        }).catch(() => {});
      }
    };
  }, [token]);

  const persistProgress = useCallback(
    (answers: Record<number, AnswerValue>, step: number) => {
      pendingProgressRef.current = { answers, step };
      if (progressDebounceRef.current) clearTimeout(progressDebounceRef.current);
      progressDebounceRef.current = setTimeout(() => {
        progressDebounceRef.current = null;
        const pending = pendingProgressRef.current;
        if (!pending || submittedRef.current) return;
        dispatch(setSyncStatus("saving"));
        saveProgressApi(token, { answers: pending.answers, currentStep: pending.step })
          .then(() => dispatch(setSyncStatus("idle")))
          .catch(e =>
            dispatch(setSyncError(e instanceof Error ? e.message : "Ошибка сохранения"))
          );
      }, PROGRESS_SAVE_DEBOUNCE_MS);
    },
    [token, dispatch]
  );

  const cancelPendingSave = useCallback(() => {
    if (progressDebounceRef.current) {
      clearTimeout(progressDebounceRef.current);
      progressDebounceRef.current = null;
    }
    pendingProgressRef.current = null;
  }, []);

  const markAsSubmitted = useCallback(() => {
    submittedRef.current = true;
    cancelPendingSave();
    dispatch(markSubmitted());
  }, [dispatch, cancelPendingSave]);

  return {
    initialized,
    needDemographics,
    setNeedDemographics,
    initialAnswers,
    loadError,
    persistProgress,
    cancelPendingSave,
    markAsSubmitted
  };
}
