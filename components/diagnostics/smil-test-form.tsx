"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setStep, setVariant } from "@/store/slices/diagnostics-progress.slice";
import { useSmilProgress, saveProgressApi, resolveSmilVariant } from "@/hooks/use-smil-progress";
import type { AnswerValue } from "@/hooks/use-smil-progress";
import { useSmilQuestions } from "@/hooks/use-smil-questions";
import { useSmilSubmit } from "@/hooks/use-smil-submit";

const SMIL_QUESTION_COUNT = 566;

const INSTRUCTIONS = `Стандартизированный многофакторный метод исследования личности (СМИЛ), Л.Н. Собчик.

Вам предлагается 566 утверждений. Отвечайте «Верно», если утверждение верно по отношению к вам, или «Неверно», если неверно. Отвечайте честно, опираясь на то, как вы обычно себя ведёте. Правильных или неправильных ответов нет.

Вы можете в любой момент закрыть окно и вернуться к тесту позже — прогресс сохраняется.`;

export interface SmilClientInfo {
  gender?: string | null;
  dateOfBirth?: string | null;
}

interface Props {
  token: string;
  clientInfo?: SmilClientInfo | null;
}

export function SmilTestForm({ token, clientInfo }: Props) {
  const dispatch = useAppDispatch();

  // Глобальный state из slice
  const variant = useAppSelector(state => state.diagnosticsProgress.variant);
  const currentStep = useAppSelector(state => state.diagnosticsProgress.currentStep);
  const syncStatus = useAppSelector(state => state.diagnosticsProgress.syncStatus);

  // Прогресс: загрузка/сохранение
  const {
    initialized,
    needDemographics,
    setNeedDemographics,
    initialAnswers,
    loadError,
    persistProgress,
    markAsSubmitted
  } = useSmilProgress({ token, clientInfo });

  // Вопросы через TanStack Query
  const { questions, questionsLoading, questionError } = useSmilQuestions(variant);

  // Сабмит
  const { submit, submitting, submitError, result } = useSmilSubmit(token, markAsSubmitted);

  // Локальный state: только то, что не нужно глобально
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [demographicsGender, setDemographicsGender] = useState("");
  const [demographicsAge, setDemographicsAge] = useState("");

  // Подставляем ответы из сервера после инициализации
  useEffect(() => {
    if (initialized) setAnswers(initialAnswers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  // Производные значения шагов
  const instructionStep = needDemographics ? 1 : 0;
  const firstQuestionStep = needDemographics ? 2 : 1;
  const totalSteps = needDemographics
    ? 1 + 1 + SMIL_QUESTION_COUNT
    : 1 + SMIL_QUESTION_COUNT;
  const isDemographicsStep = needDemographics && currentStep === 0;
  const isInstructionStep = currentStep === instructionStep;
  const questionStepIndex = currentStep >= firstQuestionStep ? currentStep - firstQuestionStep : -1;
  const currentQuestion =
    questionStepIndex >= 0 && questions[questionStepIndex]
      ? questions[questionStepIndex]
      : null;
  const isLastQuestion = currentStep === firstQuestionStep + SMIL_QUESTION_COUNT - 1;
  const progressPercent = totalSteps <= 1 ? 0 : (currentStep / (totalSteps - 1)) * 100;
  const questionNumber = questionStepIndex >= 0 ? questionStepIndex + 1 : 0;

  const getAnswer = (index: number): 0 | 1 | undefined => {
    const v = answers[index];
    return v === 0 || v === 1 ? v : undefined;
  };
  const allAnswered =
    questions.length === SMIL_QUESTION_COUNT &&
    questions.every(q => getAnswer(q.index) !== undefined);

  const goPrev = useCallback(() => {
    if (currentStep > 0) dispatch(setStep(currentStep - 1));
  }, [currentStep, dispatch]);

  async function handleDemographicsSubmit() {
    const gender =
      demographicsGender === "male" || demographicsGender === "female"
        ? demographicsGender
        : null;
    const ageNum =
      demographicsAge.trim() === "" ? null : parseInt(demographicsAge, 10);
    if (!gender || ageNum == null || ageNum < 1 || ageNum > 120) {
      setError("Укажите пол и возраст (число от 1 до 120).");
      return;
    }
    setError(null);
    const v = resolveSmilVariant(gender, ageNum);
    try {
      await saveProgressApi(token, {
        currentStep: 1,
        meta: { variant: v, gender, age: ageNum }
      });
      dispatch(setVariant(v));
      dispatch(setStep(1));
      setNeedDemographics(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    }
  }

  async function handleSelectAnswer(questionIndex: number, value: AnswerValue) {
    const nextAnswers: Record<number, AnswerValue> = { ...answers, [questionIndex]: value };
    setAnswers(nextAnswers);

    if (isLastQuestion) {
      if (questions.every(q => nextAnswers[q.index] !== undefined) && variant) {
        await submit(nextAnswers, variant);
      }
      persistProgress(nextAnswers, currentStep);
      return;
    }

    const nextStep = currentStep + 1;
    persistProgress(nextAnswers, nextStep);
    dispatch(setStep(nextStep));
  }

  async function handleSubmit() {
    if (!allAnswered || !variant) return;
    await submit(answers, variant);
  }

  // --- Рендер результата ---
  if (result) {
    return (
      <Card className="relative max-w-2xl w-full mx-auto">
        <CardHeader className="pr-10">
          <CardTitle className="text-lg">Результаты: СМИЛ (Л.Н. Собчик)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.scores && Object.keys(result.scores).length > 0 && (
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                T-баллы по шкалам (профильный лист:{" "}
                {result.profileSheet === "female" ? "женский" : "мужской"} вариант)
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                {(
                  ["L", "F", "K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"] as SmilScaleKey[]
                ).map(key =>
                  result.scores?.[key] != null ? (
                    <li key={key}>
                      {smilScaleLabel(key, result.profileSheet ?? "male")}:{" "}
                      <strong>{result.scores[key]}</strong>
                    </li>
                  ) : null
                )}
              </ul>
            </div>
          )}
          <p className="whitespace-pre-line text-justify text-sm text-foreground">
            {result.text}
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

  // --- Загрузка прогресса ---
  if (!initialized) {
    return (
      <Card className="max-w-2xl w-full mx-auto">
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Загрузка…
        </CardContent>
      </Card>
    );
  }

  // --- Критическая ошибка (ссылка недействительна и т.п.) ---
  const criticalError = loadError ?? questionError;
  if (criticalError && (currentStep === 0 || !variant)) {
    return (
      <Card className="max-w-2xl w-full mx-auto">
        <CardContent className="py-8">
          <p className="text-sm text-destructive mb-4">{criticalError}</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/client">Вернуться в кабинет</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // --- Форма демографических данных ---
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
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end pt-2">
            <Button onClick={handleDemographicsSubmit}>Продолжить</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // --- Загрузка вопросов ---
  if (questionsLoading || (variant && questions.length === 0)) {
    return (
      <Card className="max-w-2xl w-full mx-auto">
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Загрузка вопросов…
        </CardContent>
      </Card>
    );
  }

  const isBusy = submitting || syncStatus === "saving";

  // --- Инструкция и вопросы ---
  return (
    <Card className="relative max-w-2xl w-full mx-auto">
      <CardHeader className="pr-10 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">
            {isInstructionStep
              ? "Инструкция"
              : `Вопрос ${questionNumber} из ${SMIL_QUESTION_COUNT}`}
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
                  dispatch(setStep(firstQuestionStep));
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
            <p className="text-xs text-muted-foreground">Выберите ответ: Верно или Неверно</p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                type="button"
                variant={getAnswer(currentQuestion.index) === 1 ? "default" : "outline"}
                size="lg"
                className="h-12 text-base"
                disabled={isBusy}
                onClick={() => void handleSelectAnswer(currentQuestion.index, 1)}
              >
                Верно
              </Button>
              <Button
                type="button"
                variant={getAnswer(currentQuestion.index) === 0 ? "default" : "outline"}
                size="lg"
                className="h-12 text-base"
                disabled={isBusy}
                onClick={() => void handleSelectAnswer(currentQuestion.index, 0)}
              >
                Неверно
              </Button>
            </div>

            {(submitError ?? criticalError) && (
              <div className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                {submitError ?? criticalError}
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
                <Button
                  onClick={() => void handleSubmit()}
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
