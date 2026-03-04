"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

type AppointmentItem = {
  id: string;
  start: string;
  end: string;
  psychologistName: string;
  status: "PENDING_CONFIRMATION" | "SCHEDULED";
  proposedByPsychologist?: boolean;
};

type DiagnosticItem = {
  id: string;
  testTitle: string;
  createdAt: string;
  interpretation?: string | null;
};

type RecommendationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  psychologistName: string;
};

type DashboardData = {
  name: string;
  upcomingAppointments: number;
  upcomingAppointmentsList: AppointmentItem[];
  testResults: number;
  diagnosticResults: DiagnosticItem[];
  recommendations: RecommendationItem[];
};

function formatAppointmentDateTime(start: string, end: string): string {
  const d = new Date(start);
  const e = new Date(end);
  const date = d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  const timeStart = d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  });
  const timeEnd = e.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  });
  return `${date}, ${timeStart}–${timeEnd}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

export function ClientDashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/client/dashboard");
        if (cancelled) return;
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (res.status === 401) {
            window.location.href = "/auth/login?callbackUrl=/client";
            return;
          }
          if (res.status === 403) {
            window.location.href = "/";
            return;
          }
          setError(body?.error ?? "Не удалось загрузить данные");
          setLoading(false);
          return;
        }
        const json = (await res.json()) as DashboardData;
        if (cancelled) return;
        setData(json);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Ошибка сети";
        setError(
          msg.includes("fetch") ||
            msg.includes("Failed to fetch") ||
            msg.includes("CONNECTION_REFUSED")
            ? "Сервер недоступен (он мог завершиться при запросе к API). Запустите снова npm run dev и обновите страницу. Если используете Neon — проверьте, что база «разбужена» в консоли Neon."
            : msg
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function updateAppointment(id: string, status: "SCHEDULED" | "CANCELED") {
    setUpdatingAppointmentId(id);
    try {
      const res = await fetch(`/api/client/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message ?? "Не удалось обновить запись");
      }
      setData(prev => {
        if (!prev) return prev;
        if (status === "CANCELED") {
          return {
            ...prev,
            upcomingAppointmentsList: prev.upcomingAppointmentsList.filter(a => a.id !== id),
            upcomingAppointments: Math.max(0, prev.upcomingAppointments - 1)
          };
        }
        return {
          ...prev,
          upcomingAppointmentsList: prev.upcomingAppointmentsList.map(a =>
            a.id === id ? { ...a, status: status as "PENDING_CONFIRMATION" | "SCHEDULED" } : a
          )
        };
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Не удалось обновить запись");
    } finally {
      setUpdatingAppointmentId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-400">Загрузка кабинета…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4 rounded-lg border border-amber-700/60 bg-amber-950/40 p-6 text-amber-200">
        <p className="font-medium">Ошибка загрузки</p>
        <p className="text-sm">{error ?? "Нет данных"}</p>
        <p className="text-sm">
          <Link href="/auth/login?callbackUrl=/client" className="underline">
            Перейти на страницу входа
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-xl font-semibold text-slate-50">Кабинет клиента</h1>
        <p className="text-sm text-slate-300">
          {data.name}. Здесь вы можете управлять записями, смотреть результаты
          психологической диагностики и рекомендации психолога.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-normal text-slate-400 uppercase">
              Предстоящие приёмы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-50">
              {data.upcomingAppointments}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-normal text-slate-400 uppercase">
              Результаты тестов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-50">
              {data.testResults}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-normal text-slate-400 uppercase">
              Полезные действия
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-slate-300">
            <ul className="list-disc list-inside space-y-1">
              <li>
                <Link
                  href="/client/psychologists"
                  className="text-sky-400 hover:underline"
                >
                  Выбрать психолога и записаться
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="appointments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="appointments">Записи</TabsTrigger>
          <TabsTrigger value="diagnostics">Диагностика</TabsTrigger>
          <TabsTrigger value="recommendations">Рекомендации</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-3">
          {data.upcomingAppointmentsList.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-sm text-slate-400">
                У вас пока нет предстоящих записей.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Ближайшие записи</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <ul className="space-y-2">
                  {data.upcomingAppointmentsList.map(apt => (
                    <li
                      key={apt.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm"
                    >
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-medium text-slate-50">
                            {apt.psychologistName}
                          </span>
                          {apt.status === "PENDING_CONFIRMATION" && (
                            <span className="rounded bg-amber-900/60 px-2 py-0.5 text-[11px] text-amber-200">
                              Ожидает подтверждения
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          {formatAppointmentDateTime(apt.start, apt.end)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {apt.status === "PENDING_CONFIRMATION" &&
                          apt.proposedByPsychologist && (
                            <Button
                              size="sm"
                              className="h-8 text-[11px]"
                              disabled={updatingAppointmentId === apt.id}
                              onClick={() => updateAppointment(apt.id, "SCHEDULED")}
                            >
                              Подтвердить
                            </Button>
                          )}
                        {(apt.status === "PENDING_CONFIRMATION" ||
                          apt.status === "SCHEDULED") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-[11px]"
                            disabled={updatingAppointmentId === apt.id}
                            onClick={() => updateAppointment(apt.id, "CANCELED")}
                          >
                            Отменить
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-3">
          {data.diagnosticResults.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-sm text-slate-400">
                Результаты психологической диагностики пока не сохранены.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Результаты психологической диагностики
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <ul className="space-y-2">
                  {data.diagnosticResults.map(r => (
                    <li
                      key={r.id}
                      className="rounded-md border border-border bg-card px-3 py-2"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium text-slate-50">
                          {r.testTitle}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDate(r.createdAt)}
                        </span>
                      </div>
                      {r.interpretation && (
                        <p className="mt-1 text-xs text-slate-300 whitespace-pre-line">
                          {r.interpretation}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-3">
          {data.recommendations.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-sm text-slate-400">
                Рекомендации от психолога пока не добавлены.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Рекомендации психолога</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <ul className="space-y-2">
                  {data.recommendations.map(rec => (
                    <li
                      key={rec.id}
                      className="rounded-md border border-border bg-card px-3 py-2"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-slate-50">
                            {rec.title}
                          </span>
                          <span className="text-xs text-slate-400">
                            {rec.psychologistName}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {formatDate(rec.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-300 whitespace-pre-line">
                        {rec.body}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
