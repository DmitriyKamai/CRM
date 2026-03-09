import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { ClientDashboardClient } from "./client-dashboard-client";

/**
 * Страница кабинета клиента: тяжёлая логика (сессия, БД) вынесена в API и клиентский компонент,
 * чтобы при рендере сервером не выполнять код, который может ронять процесс.
 */
export default async function ClientDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/client");
  }
  const role = (session.user as { role?: string }).role;
  if (role === "UNSPECIFIED") {
    redirect("/auth/choose-role");
  }
  if (role !== "CLIENT") {
    redirect("/");
  }

  return <ClientDashboardClient />;
}
