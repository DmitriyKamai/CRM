import { ClientDashboardClient } from "./client-dashboard-client";

/**
 * Страница кабинета клиента: тяжёлая логика (сессия, БД) вынесена в API и клиентский компонент,
 * чтобы при рендере сервером не выполнять код, который может ронять процесс.
 */
export default function ClientDashboardPage() {
  return <ClientDashboardClient />;
}
