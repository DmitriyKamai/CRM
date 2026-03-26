"use client";

import Link from "next/link";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDiagnosticProgress } from "@/hooks/use-diagnostic-progress";
import { useDiagnosticSubmit } from "@/hooks/use-diagnostic-submit";

interface QuestionDto {
  id: string;
  index: number;
  text: string;
}

interface Props {
  token: string;
  questions: QuestionDto[];
}

/** 0 = нет, 1 = в некоторой степени, 2 = да */
type AnswerValue = 0 | 1 | 2;

const VALID_ANSWER_VALUES = [0, 1, 2] as const;

const INSTRUCTIONS = `Личностный опросник для определения типа акцентуаций К. Леонгарда, Г. Шмишека. Адаптация: Павлова Г.Г., 2025.

Вам будут предложены утверждения, касающиеся вашего поведения и характера. Внимательно прочтите и выразите степень согласия, выбрав один из вариантов ответов: «Да», «В некоторой степени», «Нет». Не раздумывайте над вопросами долго, отвечайте так, как вам кажется в настоящий момент.

Вы можете в любой момент закрыть окно и вернуться к тесту позже — прогресс сохраняется.`;

const SCALE_LABELS: Record<string, string> = {
  hyperthymic: "Гипертимный",
  stuck: "Застревающий",
  emotive: "Эмотивный",
  pedantic: "Педантичный",
  anxious: "Тревожно-боязливый",
  cyclothymic: "Циклотимный",
  demonstrative: "Демонстративный",
  excitable: "Возбудимый",
  dysthymic: "Дистимный",
  exalted: "Экзальтированный"
};

export function PavlovaTestForm({ token, questions }: Props) {
  const totalSteps = 1 + questions.length;

  const {
    answers,
    setAnswers,
    currentStep,
    setCurrentStep,
    initialized,
    loadError,
    syncSaving,
    persistProgress,
    markAsSubmitted
  } = useDiagnosticProgress({ token, totalSteps, validAnswerValues: VALID_ANSWER_VALUES });

  const { submit, submitting, submitError, result } = useDiagnosticSubmit(
    token,
    "/api/diagnostics/pavlova/submit",
    markAsSubmitted
  );

  const isInstructions = currentStep === 0;
  const isLastQuestion = currentStep >= 1 && currentStep === questions.length;
  const currentQuestion =
    currentStep >= 1 && questions[currentStep - 1] ? questions[currentStep - 1] : null;

  const getAnswer = (questionIndex: number): AnswerValue | undefined => {
    const v = answers[questionIndex];
    if (v === 0 || v === 1 || v === 2) return v as AnswerValue;
    return undefined;
  };

  const allAnswered =
    questions.length > 0 &&
    questions.every(q => {
      const v = answers[q.index];
      return v === 0 || v === 1 || v === 2;
    });

  const missingQuestionIndices = questions
    .filter(q => {
      const v = answers[q.index];
      return v !== 0 && v !== 1 && v !== 2;
    })
    .map(q => q.index);

  const goPrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  }, [currentStep, setCurrentStep]);

  async function handleSelectAnswer(questionIndex: number, value: AnswerValue) {
    const nextAnswers = { ...answers, [questionIndex]: value };
    setAnswers(nextAnswers);

    if (isLastQuestion) {
      const allDone = questions.every(q => {
        const v = q.index === questionIndex ? value : nextAnswers[q.index];
        return v === 0 || v === 1 || v === 2;
      });
      if (allDone) {
        await submit(nextAnswers);
      }
      persistProgress(nextAnswers, currentStep);
      return;
    }

    const nextStep = currentStep + 1;
    persistProgress(nextAnswers, nextStep);
    setCurrentStep(nextStep);
  }

  // --- Результат ---
  if (result) {
    return (
      <Card className="relative max-w-2xl w-full mx-auto">
        <CardHeader className="pr-10">
          <CardTitle className="text-lg">
            Результаты: Личностный опросник для определения типа акцентуаций К. Леонгарда, Г. Шмишека (адаптация Павлова Г.Г., 2025)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.scores && Object.keys(result.scores).length > 0 && (
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Баллы по шкалам (0–48)</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                {(Object.entries(result.scores) as [string, number][]).map(([key, value]) => (
                  <li key={key}>
                    {SCALE_LABELS[key] ?? key}: <strong>{value}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="whitespace-pre-line text-justify text-sm text-foreground">{result.text}</p>
          <div className="mt-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/client">Вернуться в кабинет</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // --- Загрузка ---
  if (!initialized) {
    return (
      <Card className="max-w-2xl w-full mx-auto">
        <CardContent className="py-8 text-center text-muted-foreground text-sm">Загрузка…</CardContent>
      </Card>
    );
  }

  // --- Критическая ошибка ---
  if (loadError && currentStep === 0) {
    return (
      <Card className="max-w-2xl w-full mx-auto">
        <CardContent className="py-8">
          <p className="text-sm text-destructive mb-4">{loadError}</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/client">Вернуться в кабинет</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const progressPercent = totalSteps <= 1 ? 0 : (currentStep / (totalSteps - 1)) * 100;
  const isBusy = submitting || syncSaving;

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
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
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
            <p className="whitespace-pre-line text-justify text-sm text-muted-foreground">{INSTRUCTIONS}</p>
            <div className="flex justify-end pt-2">
              <Button onClick={() => { setCurrentStep(1); persistProgress(answers, 1); }}>
                Начать тест
              </Button>
            </div>
          </>
        ) : currentQuestion ? (
          <>
            {(() => {
              const missingPrevious = isLastQuestion
                ? missingQuestionIndices.filter(i => i !== currentQuestion.index)
                : [];
              return (
                <>
                  <p className="text-sm font-medium text-foreground">
                    {currentQuestion.index}. {currentQuestion.text}
                  </p>
                  <p className="text-xs text-muted-foreground">Выберите степень согласия:</p>
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    {([0, 1, 2] as AnswerValue[]).map((val, i) => (
                      <Button
                        key={val}
                        type="button"
                        variant={getAnswer(currentQuestion.index) === val ? "default" : "outline"}
                        size="lg"
                        className="h-12 text-sm"
                        disabled={isBusy}
                        onClick={() => void handleSelectAnswer(currentQuestion.index, val)}
                      >
                        {i === 0 ? "Нет" : i === 1 ? "В некоторой степени" : "Да"}
                      </Button>
                    ))}
                  </div>

                  {submitError && (
                    <div className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                      {submitError}
                    </div>
                  )}

                  {missingPrevious.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                      <span>
                        Чтобы завершить тест, ответьте на вопрос{missingPrevious.length === 1 ? "" : "ы"}:{" "}
                        {missingPrevious.slice().sort((a, b) => a - b).join(", ")}.
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setCurrentStep(missingPrevious[0])}
                      >
                        Перейти к вопросу {missingPrevious[0]}
                      </Button>
                    </div>
                  )}
                </>
              );
            })()}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
              <Button type="button" variant="outline" size="sm" disabled={currentStep <= 1} onClick={goPrev}>
                Назад
              </Button>
              {isLastQuestion && (
                <Button onClick={() => void submit(answers)} disabled={!allAnswered || submitting}>
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
