"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

/** Задержка перед отправкой прогресса на сервер (мс). При частых кликах отправляется один запрос с последним состоянием. */
const PROGRESS_SAVE_DEBOUNCE_MS = 500;

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuestionDto {
  id: string;
  index: number;
  text: string;
}

interface Props {
  token: string;
  questions: QuestionDto[];
}

type AnswerValue = 0 | 1;

const INSTRUCTIONS = `Тест по изучению акцентуаций характера (детский вариант) Шмишек Х.

Вам предлагается ответить на 88 вопросов, касающихся различных сторон вашей личности. На каждый вопрос ответьте «Да», если согласны с утверждением, или «Нет», если не согласны. Отвечайте честно, опираясь на то, как вы обычно себя ведёте. Правильных или неправильных ответов нет.

Вы можете в любой момент закрыть окно и вернуться к тесту позже — прогресс сохраняется.`;

async function fetchProgress(token: string): Promise<{ answers: Record<number, AnswerValue>; currentStep: number }> {
  const res = await fetch(`/api/diagnostics/progress?token=${encodeURIComponent(token)}`);
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
    if (num === 0 || num === 1) {
      answers[idx] = num as AnswerValue;
    }
  }
  return {
    answers,
    currentStep: typeof data.currentStep === "number" ? Math.max(0, data.currentStep) : 0
  };
}

async function saveProgress(
  token: string,
  answers: Record<number, AnswerValue>,
  currentStep: number
): Promise<void> {
  const res = await fetch("/api/diagnostics/progress", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, answers, currentStep })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? "Не удалось сохранить прогресс");
  }
}

export function ShmishekTestForm({ token, questions }: Props) {
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [resultScores, setResultScores] = useState<Record<string, number> | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);

  const progressDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingProgressRef = useRef<{ answers: Record<number, AnswerValue>; step: number } | null>(null);

  const totalSteps = 1 + questions.length;
  const currentQuestionIndex = currentStep - 1;
  const currentQuestion =
    currentStep >= 1 && questions[currentQuestionIndex]
      ? questions[currentQuestionIndex]
      : null;
  const getAnswer = (questionIndex: number): 0 | 1 | undefined => {
    const v = answers[questionIndex] ?? answers[Number(questionIndex)] ?? answers[String(questionIndex) as unknown as number];
    if (v === 0 || v === 1) return v;
    const vNum = Number(v);
    if (Number.isFinite(vNum) && (vNum === 0 || vNum === 1)) return vNum as AnswerValue;
    return undefined;
  };
  const hasAnswer = (q: QuestionDto) => getAnswer(q.index) !== undefined;
  const allAnswered =
    questions.length > 0 &&
    questions.every(q => {
      const v = answers[q.index] ?? answers[Number(q.index)] ?? answers[String(q.index) as unknown as number];
      return v === 0 || v === 1;
    });
  const isInstructions = currentStep === 0;
  const isLastQuestion = currentStep >= 1 && currentStep === questions.length;

  const missingQuestionIndices = questions.filter(q => {
    const v = answers[q.index] ?? answers[Number(q.index)] ?? answers[String(q.index) as unknown as number];
    return v !== 0 && v !== 1;
  }).map(q => q.index);

  const persistProgress = useCallback(
    (nextAnswers: Record<number, AnswerValue>, nextStep: number) => {
      pendingProgressRef.current = { answers: nextAnswers, step: nextStep };
      if (progressDebounceTimerRef.current) {
        clearTimeout(progressDebounceTimerRef.current);
      }
      progressDebounceTimerRef.current = setTimeout(() => {
        progressDebounceTimerRef.current = null;
        const pending = pendingProgressRef.current;
        if (!pending) return;
        setSavingProgress(true);
        saveProgress(token, pending.answers, pending.step)
          .catch(e => console.error(e))
          .finally(() => setSavingProgress(false));
      }, PROGRESS_SAVE_DEBOUNCE_MS);
    },
    [token]
  );

  useEffect(() => {
    let cancelled = false;
    fetchProgress(token)
      .then(({ answers: a, currentStep: s }) => {
        if (cancelled) return;
        setAnswers(a);
        setCurrentStep(Math.min(s, totalSteps - 1));
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
  }, [token, totalSteps]);

  useEffect(() => {
    return () => {
      if (progressDebounceTimerRef.current) {
        clearTimeout(progressDebounceTimerRef.current);
        progressDebounceTimerRef.current = null;
        const pending = pendingProgressRef.current;
        if (pending) {
          saveProgress(token, pending.answers, pending.step).catch(() => {});
        }
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
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    }
  }, [currentStep]);

  function handleSelectAnswer(questionIndex: number, value: AnswerValue) {
    const nextAnswers: Record<number, AnswerValue> = { ...answers, [questionIndex]: value };
    setAnswers(nextAnswers);

    if (isLastQuestion) {
      const allDone = questions.every(q => {
        const v = q.index === questionIndex ? value : nextAnswers[q.index];
        return v === 0 || v === 1;
      });
      if (allDone) {
        setSubmitting(true);
        setError(null);
        fetch("/api/diagnostics/shmishek/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, answers: nextAnswers })
        })
          .then(res => {
            return res.json().catch(() => null).then(data => ({ ok: res.ok, data }));
          })
          .then(({ ok, data }) => {
            if (!ok) {
              setError(data?.message ?? "Не удалось сохранить результат");
              return;
            }
            setResultText(data?.interpretation ?? "Результат сохранён.");
            setResultScores(data?.scaleScores ?? null);
          })
          .catch(() => {
            setError("Не удалось подключиться к серверу");
          })
          .finally(() => {
            setSubmitting(false);
          });
      }
      persistProgress(nextAnswers, currentStep);
      return;
    }

    // Переход к следующему только при валидном ответе (0–3) на текущий вопрос
    const currentAnswer = nextAnswers[questionIndex];
    if (currentAnswer !== 0 && currentAnswer !== 1) return;
    const nextStep = currentStep + 1;
    persistProgress(nextAnswers, nextStep);
    setCurrentStep(nextStep);
  }

  async function handleSubmit() {
    if (!allAnswered) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/diagnostics/shmishek/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, answers })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.message ?? "Не удалось сохранить результат");
        setSubmitting(false);
        return;
      }
      setResultText(data.interpretation ?? "Результат сохранён.");
      setResultScores(data.scaleScores ?? null);
    } catch (err) {
      console.error(err);
      setError("Не удалось подключиться к серверу");
    } finally {
      setSubmitting(false);
    }
  }

  const scaleLabels: Record<string, string> = {
    hyperthymic: "Гипертимный",
    dysthymic: "Дистимный",
    cyclothymic: "Циклотимный",
    exalted: "Экзальтированный",
    anxious: "Тревожно-боязливый",
    emotive: "Эмотивный",
    demonstrative: "Демонстративный",
    stuck: "Застревающий",
    excitable: "Возбудимый",
    pedantic: "Педантичный"
  };

  if (resultText) {
    return (
      <Card className="relative max-w-2xl w-full mx-auto">
        <CardHeader className="pr-10">
          <CardTitle className="text-lg">Результаты: Тест по изучению акцентуаций характера (детский вариант) Шмишек Х.</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {resultScores && Object.keys(resultScores).length > 0 && (
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Сырые баллы по шкалам</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                {Object.entries(resultScores).map(([key, value]) => (
                  <li key={key}>
                    {scaleLabels[key] ?? key}: <strong>{value}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="whitespace-pre-line text-sm text-foreground">{resultText}</p>
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

  if (error && currentStep === 0) {
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

  const progressPercent =
    totalSteps <= 1 ? 0 : (currentStep / (totalSteps - 1)) * 100;

  return (
    <Card className="relative max-w-2xl w-full mx-auto">
      <CardHeader className="pr-10 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">
            {isInstructions ? "Инструкция" : `Вопрос ${currentStep} из ${questions.length}`}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 h-8 w-8 shrink-0 rounded-full"
            asChild
          >
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
        {!isInstructions && (
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isInstructions ? (
          <>
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {INSTRUCTIONS}
            </p>
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => {
                  setCurrentStep(1);
                  persistProgress(answers, 1);
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
              Выберите ответ: Да или Нет
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
                Да
              </Button>
              <Button
                type="button"
                variant={getAnswer(currentQuestion.index) === 0 ? "default" : "outline"}
                size="lg"
                className="h-12 text-base"
                disabled={submitting || savingProgress}
                onClick={() => handleSelectAnswer(currentQuestion.index, 0)}
              >
                Нет
              </Button>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                {error}
              </div>
            )}

            {isLastQuestion && missingQuestionIndices.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                <span>
                  Чтобы завершить тест, ответьте на вопрос{missingQuestionIndices.length === 1 ? "" : "ы"}:{" "}
                  {missingQuestionIndices.slice().sort((a, b) => a - b).join(", ")}.
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setCurrentStep(missingQuestionIndices[0])}
                >
                  Перейти к вопросу {missingQuestionIndices[0]}
                </Button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentStep <= 1}
                onClick={goPrev}
              >
                Назад
              </Button>
              {isLastQuestion && (
                <Button
                  onClick={handleSubmit}
                  disabled={!allAnswered || submitting}
                >
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
