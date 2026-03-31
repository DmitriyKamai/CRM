"use client";

import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import type { DashboardData } from "@/hooks/use-client-dashboard";

type DiagnosticsTabProps = {
  data: DashboardData;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

export function DiagnosticsTab({ data }: DiagnosticsTabProps) {
  return (
    <div className="space-y-3">
      {data.pendingDiagnosticLinks && data.pendingDiagnosticLinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Тесты к прохождению</CardTitle>
            <p className="text-xs text-muted-foreground">
              Психолог отправил вам эти тесты. Пройдите их по ссылке.
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ul className="space-y-2">
              {data.pendingDiagnosticLinks.map(link => (
                <li
                  key={link.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
                >
                  <div>
                    <div className="font-medium text-foreground">{link.testTitle}</div>
                    <div className="text-xs text-muted-foreground">
                      {link.psychologistName} · {formatDate(link.createdAt)}
                    </div>
                  </div>
                  <Button size="sm" variant="default" asChild>
                    <Link href={`/diagnostics/${link.token}`}>
                      {link.hasProgress ? "Продолжить" : "Пройти тест"}
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      {data.diagnosticResults.length === 0 &&
      (!data.pendingDiagnosticLinks || data.pendingDiagnosticLinks.length === 0) ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Результаты психологической диагностики пока не сохранены. Если психолог отправит вам
            тест, он появится здесь в блоке «Тесты к прохождению».
          </CardContent>
        </Card>
      ) : data.diagnosticResults.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Результаты психологической диагностики</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ul className="space-y-2">
              {data.diagnosticResults.map(r => (
                <li
                  key={r.id}
                  className="rounded-md border border-border bg-card px-3 py-2"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-foreground">{r.testTitle}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(r.createdAt)}
                    </span>
                  </div>
                  {r.interpretation && (
                    <p className="mt-1 text-xs text-muted-foreground whitespace-pre-line">
                      {r.interpretation}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
