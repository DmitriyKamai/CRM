"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { DashboardData } from "@/hooks/use-client-dashboard";

type RecommendationsTabProps = {
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

export function RecommendationsTab({ data }: RecommendationsTabProps) {
  return (
    <div className="space-y-3">
      {data.recommendations.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
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
                      <span className="font-medium text-foreground">{rec.title}</span>
                      <span className="text-xs text-muted-foreground">{rec.psychologistName}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(rec.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground whitespace-pre-line">
                    {rec.body}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
