import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardMetricsProps = {
  upcomingAppointments: number;
  testResults: number;
  schedulingEnabled?: boolean;
  diagnosticsEnabled?: boolean;
};

export function DashboardMetrics({
  upcomingAppointments,
  testResults,
  schedulingEnabled = true,
  diagnosticsEnabled = true
}: DashboardMetricsProps) {
  const metricsCardCount =
    (schedulingEnabled ? 1 : 0) + (diagnosticsEnabled ? 1 : 0) + 1;

  return (
    <section
      className={`grid gap-3 ${
        metricsCardCount >= 3
          ? "md:grid-cols-3"
          : metricsCardCount === 2
            ? "md:grid-cols-2"
            : "md:grid-cols-1"
      }`}
    >
      {schedulingEnabled && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-normal text-muted-foreground uppercase">
              Предстоящие приёмы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">
              {upcomingAppointments}
            </div>
          </CardContent>
        </Card>
      )}

      {diagnosticsEnabled && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-normal text-muted-foreground uppercase">
              Результаты тестов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">{testResults}</div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-normal text-muted-foreground uppercase">
            Каталог психологов
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs text-muted-foreground">
          <ul className="list-disc list-inside space-y-1">
            <li>
              <Link
                href="/catalog"
                className="text-primary/90 transition-colors hover:text-primary"
              >
                {schedulingEnabled
                  ? "Выбрать психолога и записаться"
                  : "Найти психолога"}
              </Link>
            </li>
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
