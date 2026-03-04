"use client";

import { useState } from "react";

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

type AnswerValue = 0 | 1 | 2 | 3;

export function ShmishekTestForm({ token, questions }: Props) {
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);

  function handleChange(questionIndex: number, value: AnswerValue) {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: value
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/diagnostics/shmishek/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token,
          answers
        })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.message ?? "Не удалось сохранить результат");
        setSubmitting(false);
        return;
      }

      setResultText(data.interpretation ?? "Результат сохранён.");
      setSubmitting(false);
    } catch (err) {
      console.error(err);
      setError("Не удалось подключиться к серверу");
      setSubmitting(false);
    }
  }

  if (resultText) {
    return (
      <Card className="max-w-2xl w-full mx-auto">
        <CardHeader>
          <CardTitle className="text-lg">
            Результаты опросника Шмишека
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-line text-sm text-foreground">
            {resultText}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl w-full mx-auto">
      <CardHeader>
        <CardTitle className="text-lg">Опросник Шмишека</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Отметьте, насколько каждое утверждение соответствует вам. 0 — совсем
          не про меня, 3 — очень про меня.
        </p>

        {error && (
          <div className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4 max-h-[60vh] overflow-y-auto pr-1"
        >
          <div className="space-y-3">
            {questions.map(q => (
              <div
                key={q.id}
                className="rounded-md border border-border bg-card px-3 py-2"
              >
                <div className="text-sm mb-2">
                  {q.index}. {q.text}
                </div>
                <div className="flex gap-2 text-xs">
                  {[0, 1, 2, 3].map(value => (
                    <Button
                      key={value}
                      type="button"
                      variant={answers[q.index] === value ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => handleChange(q.index, value as AnswerValue)}
                    >
                      {value}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={submitting || questions.length === 0}
          >
            {submitting ? "Отправляем..." : "Завершить тест"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

