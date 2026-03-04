"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

interface TestRow {
  id: string;
  type: string;
  title: string;
  isActive: boolean;
  createdAt: string;
}

export function TestsTable() {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tests");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "Не удалось загрузить тесты");
      }
      const data = (await res.json()) as TestRow[];
      setTests(data);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить тесты"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(testId: string, isActive: boolean) {
    setSavingId(testId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tests/${testId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ isActive })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message ?? "Не удалось обновить статус теста");
      }
      setTests(prev =>
        prev.map(t => (t.id === testId ? { ...t, isActive } : t))
      );
      setSavingId(null);
    } catch (err) {
      console.error(err);
      setSavingId(null);
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось обновить статус теста"
      );
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-50">Диагностические тесты</h2>
        <Button variant="ghost" size="sm" onClick={load}>
          Обновить
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/60 bg-red-950/40 px-3 py-2 text-xs text-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-slate-300">Загружаем тесты...</div>
      ) : tests.length === 0 ? (
        <div className="text-sm text-slate-300">Тесты ещё не добавлены.</div>
      ) : (
        <div className="space-y-2 text-xs text-slate-200">
          {tests.map(test => (
            <div
              key={test.id}
              className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2"
            >
              <div>
                <div className="font-medium text-slate-50">{test.title}</div>
                <div className="text-[11px] text-slate-400">
                  Тип: {test.type} · создан{" "}
                  {new Date(test.createdAt).toLocaleString("ru-RU", {
                    dateStyle: "short",
                    timeStyle: "short"
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] ${
                    test.isActive ? "text-emerald-400" : "text-slate-500"
                  }`}
                >
                  {test.isActive ? "активен" : "отключён"}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={savingId === test.id}
                  onClick={() => toggleActive(test.id, !test.isActive)}
                >
                  {savingId === test.id
                    ? "Сохраняем..."
                    : test.isActive
                    ? "Отключить"
                    : "Включить"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

