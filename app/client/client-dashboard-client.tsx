"use client";

import Link from "next/link";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useClientDashboard } from "@/hooks/use-client-dashboard";
import { AppointmentsTab } from "@/app/client/appointments-tab";
import { DashboardMetrics } from "@/app/client/dashboard-metrics";
import { DiagnosticsTab } from "@/app/client/diagnostics-tab";
import { RecommendationsTab } from "@/app/client/recommendations-tab";

type ClientDashboardClientProps = {
  schedulingEnabled?: boolean;
  diagnosticsEnabled?: boolean;
};

export function ClientDashboardClient({
  schedulingEnabled = true,
  diagnosticsEnabled = true
}: ClientDashboardClientProps) {
  const {
    data,
    isLoading,
    error,
    updateAppointment,
    loadHistory,
    history,
    isHistoryLoading
  } = useClientDashboard();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Загрузка кабинета…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-6 text-amber-900 dark:text-amber-200">
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

  const defaultTab = schedulingEnabled
    ? "appointments"
    : diagnosticsEnabled
      ? "diagnostics"
      : "recommendations";

  const introParts: string[] = [];
  if (schedulingEnabled) introParts.push("управлять записями");
  if (diagnosticsEnabled) {
    introParts.push("смотреть результаты психологической диагностики");
  }
  introParts.push("искать психологов в каталоге");
  introParts.push("читать рекомендации психолога");
  const intro =
    introParts.length > 0
      ? `${data.name}. Здесь вы можете ${introParts.join(", ")}.`
      : `${data.name}. Добро пожаловать в кабинет.`;

  const metricsCardCount =
    (schedulingEnabled ? 1 : 0) + (diagnosticsEnabled ? 1 : 0) + 1;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-xl font-semibold text-foreground">Кабинет клиента</h1>
        <p className="text-sm text-muted-foreground">{intro}</p>
      </section>

      {metricsCardCount > 0 && (
        <DashboardMetrics
          upcomingAppointments={data.upcomingAppointments}
          testResults={data.testResults}
          schedulingEnabled={schedulingEnabled}
          diagnosticsEnabled={diagnosticsEnabled}
        />
      )}

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList>
          {schedulingEnabled && <TabsTrigger value="appointments">Записи</TabsTrigger>}
          {diagnosticsEnabled && <TabsTrigger value="diagnostics">Диагностика</TabsTrigger>}
          <TabsTrigger value="recommendations">Рекомендации</TabsTrigger>
        </TabsList>

        {schedulingEnabled && (
          <TabsContent value="appointments" className="space-y-3">
            <AppointmentsTab
              data={data}
              updateAppointment={updateAppointment}
              loadHistory={loadHistory}
              history={history}
              isHistoryLoading={isHistoryLoading}
            />
          </TabsContent>
        )}

        {diagnosticsEnabled && (
          <TabsContent value="diagnostics" className="space-y-3">
            <DiagnosticsTab data={data} />
          </TabsContent>
        )}

        <TabsContent value="recommendations" className="space-y-3">
          <RecommendationsTab data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
