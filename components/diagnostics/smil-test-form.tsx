"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { smilScaleLabel } from "@/lib/diagnostics/smil";
import type { SmilScaleKey } from "@/lib/diagnostics/smil";

const PROGRESS_SAVE_DEBOUNCE_MS = 500;
const SMIL_QUESTION_COUNT = 566;

/** Вариант опросника: мужской, женский или подростковый (мальчики 13–15 лет). */
type SmilVariant = "male" | "female" | "adolescent";
type AnswerValue = 0 | 1;

interface QuestionDto {
  id: string;
  index: number;
  text: string;
}

export interface SmilClientInfo {
  gender?: string | null;
  dateOfBirth?: string | null;
}

interface Props {
  token: string;
  clientInfo?: SmilClientInfo | null;
}

function ageFromDateOfBirth(dateOfBirth: string): number | null {
  const d = new Date(dateOfBirth);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 ? age : null;
}

/** По полу и возрасту: мальчики 13–15 — подростковый вариант, остальные — мужской/женский. */
function resolveVariant(gender: string, age: number): SmilVariant {
  if (gender === "female") return "female";
  if (gender === "male" && age >= 13 && age <= 15) return "adolescent";
  return "male";
}

const INSTRUCTIONS = `Стандартизированный многофакторный метод исследования личности (СМИЛ), Л.Н. Собчик.

Вам предлагается 566 утверждений. Отвечайте «Верно», если утверждение верно по отношению к вам, или «Неверно», если неверно. Отвечайте честно, опираясь на то, как вы обычно себя ведёте. Правильных или неправильных ответов нет.

Вы можете в любой момент закрыть окно и вернуться к тесту позже — прогресс сохраняется.`;

async function fetchProgress(token: string): Promise<{
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

async function saveProgress(
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

async function fetchQuestions(variant: SmilVariant): Promise<QuestionDto[]> {
  const res = await fetch(
    `/api/diagnostics/smil/questions?variant=${encodeURIComponent(variant)}`
  );
  if (!res.ok) throw new Error("Не удалось загрузить вопросы");
  const data = await res.json();
  return Array.isArray(data.questions) ? data.questions : [];
}

export function SmilTestForm({ token, clientInfo }: Props) {
  const [variant, setVariant] = useState<SmilVariant | null>(null);
  const [questions, setQuestions] = useState<QuestionDto[]>([]);
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [meta, setMeta] = useState<{ variant: string; gender?: string; age?: number } | null>(null);
  const [needDemographics, setNeedDemographics] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [resultScores, setResultScores] = useState<Record<string, number> | null>(null);
  const [resultProfileSheet, setResultProfileSheet] = useState<"male" | "female" | null>(null);
  const [savingProgress, setSavingProgress] = useState(false);
  const [demographicsGender, setDemographicsGender] = useState<string>("");
  const [demographicsAge, setDemographicsAge] = useState<string>("");
  const progressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingProgressRef = useRef<{
    answers: Record<number, AnswerValue>;
    step: number;
  } | null>(null);
  const submittedRef = useRef(false);

  const hasVariant = !!variant;
  const totalSteps = needDemographics
    ? 1 + 1 + SMIL_QUESTION_COUNT
    : 1 + SMIL_QUESTION_COUNT;
  const instructionStep = needDemographics ? 1 : 0;
  const firstQuestionStep = needDemographics ? 2 : 1;
  const isInstructionStep = currentStep === instructionStep;
  const questionStepIndex =
    currentStep >= firstQuestionStep
      ? currentStep - firstQuestionStep
      : -1;
  const currentQuestion =
    questionStepIndex >= 0 && questions[questionStepIndex]
      ? questions[questionStepIndex]
      : null;
  const isDemographicsStep = needDemographics && currentStep === 0;
  const isLastQuestion =
    currentStep === firstQuestionStep + SMIL_QUESTION_COUNT - 1;

  const getAnswer = (index: number): 0 | 1 | undefined => {
    const v = answers[index];
    return v === 0 || v === 1 ? v : undefined;
  };
  const allAnswered =
    questions.length === SMIL_QUESTION_COUNT &&
    questions.every(q => getAnswer(q.index) !== undefined);

  const persistProgress = useCallback(
    (nextAnswers: Record<number, AnswerValue>, nextStep: number) => {
      pendingProgressRef.current = { answers: nextAnswers, step: nextStep };
      if (progressDebounceRef.current) clearTimeout(progressDebounceRef.current);
      progressDebounceRef.current = setTimeout(() => {
        progressDebounceRef.current = null;
        const pending = pendingProgressRef.current;
        if (!pending || submittedRef.current) return;
        setSavingProgress(true);
        saveProgress(token, { answers: pending.answers, currentStep: pending.step })
          .catch(e => console.error(e))
          .finally(() => setSavingProgress(false));
      }, PROGRESS_SAVE_DEBOUNCE_MS);
    },
    [token]
  );

  useEffect(() => {
    let cancelled = false;
    fetchProgress(token)
      .then(({ answers: a, currentStep: s, meta: m }) => {
        if (cancelled) return;
        setAnswers(a);
        setMeta(m && m.variant ? (m as { variant: string; gender?: string; age?: number }) : null);
        const hasVariantFromProgress = !!m?.variant;
        const gender = clientInfo?.gender ?? m?.gender;
        const ageFromClient = clientInfo?.dateOfBirth
          ? ageFromDateOfBirth(clientInfo.dateOfBirth)
          : null;
        const age = ageFromClient ?? m?.age ?? null;
        const variantResolved =
          hasVariantFromProgress ||
          (gender === "male" || gender === "female") && age != null && age >= 0;
        const needDemo = !variantResolved;
        setNeedDemographics(needDemo);
        if (variantResolved && !hasVariantFromProgress && (gender === "male" || gender === "female") && age != null) {
          setVariant(resolveVariant(gender, age));
        } else if (hasVariantFromProgress && (m?.variant === "male" || m?.variant === "female" || m?.variant === "adolescent")) {
          setVariant(m.variant as SmilVariant);
        }
        const maxStep = needDemo ? 1 + 1 + SMIL_QUESTION_COUNT - 1 : 1 + SMIL_QUESTION_COUNT - 1;
        setCurrentStep(Math.min(s, maxStep));
      })
      .catch(e => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      })
      .finally(() => {
        if (!cancelled) setInitialized(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token, clientInfo?.gender, clientInfo?.dateOfBirth]);

  useEffect(() => {
    if (!variant || questions.length > 0) return;
    let cancelled = false;
    fetchQuestions(variant)
      .then(qs => {
        if (!cancelled) setQuestions(qs);
      })
      .catch(e => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка загрузки вопросов");
      });
    return () => {
      cancelled = true;
    };
  }, [variant]);

  useEffect(() => {
    return () => {
      if (progressDebounceRef.current) {
        clearTimeout(progressDebounceRef.current);
        progressDebounceRef.current = null;
      }
      const pending = pendingProgressRef.current;
      if (pending && !submittedRef.current) {
        saveProgress(token, { answers: pending.answers, currentStep: pending.step }).catch(
          () => {}
        );
      }
    };
  }, [token]);

  const goNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      persistProgress(answers, next);
    }
  }, [currentStep, totalSteps, answers, persistProgress]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  }, [currentStep]);

  async function handleDemographicsSubmit() {
    const gender = demographicsGender === "male" || demographicsGender === "female" ? demographicsGender : null;
    const ageNum = demographicsAge.trim() === "" ? null : parseInt(demographicsAge, 10);
    if (!gender || ageNum == null || ageNum < 1 || ageNum > 120) {
      setError("Укажите пол и возраст (число от 1 до 120).");
      return;
    }
    setError(null);
    const v = resolveVariant(gender, ageNum);
    setVariant(v);
    try {
      await saveProgress(token, {
        currentStep: 1,
        meta: { variant: v, gender, age: ageNum }
      });
      setMeta({ variant: v, gender, age: ageNum });
      setNeedDemographics(true);
      setCurrentStep(1);
      const qs = await fetchQuestions(v);
      setQuestions(qs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    }
  }

  function handleSelectAnswer(questionIndex: number, value: AnswerValue) {
    const nextAnswers: Record<number, AnswerValue> = {
      ...answers,
      [questionIndex]: value
    };
    setAnswers(nextAnswers);

    if (isLastQuestion) {
      const allDone = nextAnswers[questionIndex] !== undefined;
      if (allDone && questions.every(q => nextAnswers[q.index] !== undefined)) {
        setSubmitting(true);
        setError(null);
        fetch("/api/diagnostics/smil/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            answers: nextAnswers,
            variant: variant!
          })
        })
          .then(res => res.json().catch(() => null).then(data => ({ ok: res.ok, data })))
          .then(({ ok, data }) => {
            if (!ok) {
              setError(data?.message ?? "Не удалось сохранить результат");
              return;
            }
            submittedRef.current = true;
            if (progressDebounceRef.current) {
              clearTimeout(progressDebounceRef.current);
              progressDebounceRef.current = null;
            }
            setResultText(data?.interpretation ?? "Результат сохранён.");
            setResultScores(data?.scaleScores ?? null);
            setResultProfileSheet(data?.profileSheet === "female" || data?.profileSheet === "male" ? data.profileSheet : null);
          })
          .catch(() => setError("Не удалось подключиться к серверу"))
          .finally(() => setSubmitting(false));
      }
      persistProgress(nextAnswers, currentStep);
      return;
    }

    const nextStep = currentStep + 1;
    persistProgress(nextAnswers, nextStep);
    setCurrentStep(nextStep);
  }

  async function handleSubmit() {
    if (!allAnswered || !variant) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/diagnostics/smil/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, answers, variant })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.message ?? "Не удалось сохранить результат");
        setSubmitting(false);
        return;
      }
      submittedRef.current = true;
      if (progressDebounceRef.current) {
        clearTimeout(progressDebounceRef.current);
        progressDebounceRef.current = null;
      }
      setResultText(data?.interpretation ?? "Результат сохранён.");
      setResultScores(data?.scaleScores ?? null);
      setResultProfileSheet(data?.profileSheet === "female" || data?.profileSheet === "male" ? data.profileSheet : null);
    } catch (err) {
      console.error(err);
      setError("Не удалось подключиться к серверу");
    } finally {
      setSubmitting(false);
    }
  }

  if (resultText) {
    return (
      <Card className="relative max-w-2xl w-full mx-auto">
        <CardHeader className="pr-10">
          <CardTitle className="text-lg">Результаты: СМИЛ (Л.Н. Собчик)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {resultScores && Object.keys(resultScores).length > 0 && (
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                T-баллы по шкалам (профильный лист: {resultProfileSheet === "female" ? "женский" : "мужской"} вариант)
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                {(["L", "F", "K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"] as SmilScaleKey[]).map(key =>
                  resultScores[key] != null ? (
                    <li key={key}>
                      {smilScaleLabel(key, resultProfileSheet ?? "male")}: <strong>{resultScores[key]}</strong>
                    </li>
                  ) : null
                )}
              </ul>
            </div>
          )}
          <p className="whitespace-pre-line text-justify text-sm text-foreground">
            {resultText}
          </p>
          <div className="mt-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/client">Вернуться в кабинет</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!initialized) {
    return (
      <Card className="max-w-2xl w-full mx-auto">
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Загрузка…
        </CardContent>
      </Card>
    );
  }

  if (error && (currentStep === 0 || !variant)) {
    return (
      <Card className="max-w-2xl w-full mx-auto">
        <CardContent className="py-8">
          <p className="text-sm text-destructive mb-4">{error}</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/client">Вернуться в кабинет</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isDemographicsStep) {
    return (
      <Card className="max-w-2xl w-full mx-auto">
        <CardHeader>
          <CardTitle className="text-lg">Перед началом теста</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Для интерпретации результатов СМИЛ нужны пол и возраст. Укажите их, пожалуйста.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smil-gender">Пол</Label>
              <Select
                value={demographicsGender}
                onValueChange={v => {
                  setDemographicsGender(v);
                  setError(null);
                }}
              >
                <SelectTrigger id="smil-gender">
                  <SelectValue placeholder="Выберите пол" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Мужской</SelectItem>
                  <SelectItem value="female">Женский</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="smil-age">Возраст (полных лет)</Label>
              <Input
                id="smil-age"
                type="number"
                min={1}
                max={120}
                placeholder="Например, 25"
                value={demographicsAge}
                onChange={e => {
                  setDemographicsAge(e.target.value);
                  setError(null);
                }}
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="flex justify-end pt-2">
            <Button onClick={handleDemographicsSubmit}>
              Продолжить
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant && questions.length === 0) {
    return (
      <Card className="max-w-2xl w-full mx-auto">
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Загрузка вопросов…
        </CardContent>
      </Card>
    );
  }

  const progressPercent =
    totalSteps <= 1 ? 0 : (currentStep / (totalSteps - 1)) * 100;
  const questionNumber =
    questionStepIndex >= 0 ? questionStepIndex + 1 : 0;

  return (
    <Card className="relative max-w-2xl w-full mx-auto">
      <CardHeader className="pr-10 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">
            {isInstructionStep
              ? "Инструкция"
              : `Вопрос ${questionNumber} из ${SMIL_QUESTION_COUNT}`}
          </CardTitle>
          <Button variant="ghost" size="icon" className="absolute top-3 right-3 h-8 w-8 shrink-0 rounded-full" asChild>
            <Link href="/client" title="Закрыть и вернуться в кабинет">
              <span className="sr-only">Закрыть</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </Link>
          </Button>
        </div>
        {!isInstructionStep && (
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isInstructionStep ? (
          <>
            <p className="whitespace-pre-line text-justify text-sm text-muted-foreground">
              {INSTRUCTIONS}
            </p>
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => {
                  setCurrentStep(firstQuestionStep);
                  persistProgress(answers, firstQuestionStep);
                }}
              >
                Начать тест
              </Button>
            </div>
          </>
        ) : currentQuestion ? (
          <>
            <p className="text-sm font-medium text-foreground">
              {currentQuestion.index}. {currentQuestion.text}
            </p>
            <p className="text-xs text-muted-foreground">
              Выберите ответ: Верно или Неверно
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                type="button"
                variant={getAnswer(currentQuestion.index) === 1 ? "default" : "outline"}
                size="lg"
                className="h-12 text-base"
                disabled={submitting || savingProgress}
                onClick={() => handleSelectAnswer(currentQuestion.index, 1)}
              >
                Верно
              </Button>
              <Button
                type="button"
                variant={getAnswer(currentQuestion.index) === 0 ? "default" : "outline"}
                size="lg"
                className="h-12 text-base"
                disabled={submitting || savingProgress}
                onClick={() => handleSelectAnswer(currentQuestion.index, 0)}
              >
                Неверно
              </Button>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                {error}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentStep <= firstQuestionStep}
                onClick={goPrev}
              >
                Назад
              </Button>
              {isLastQuestion && (
                <Button onClick={handleSubmit} disabled={!allAnswered || submitting}>
                  {submitting ? "Отправляем…" : "Завершить тест"}
                </Button>
              )}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
