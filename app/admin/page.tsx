import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/admin");
  }

  if ((session.user as unknown as { role?: string | null }).role !== "ADMIN") {
    redirect("/?forbidden=1");
  }

  const [usersCount, psychologistsCount, clientsCount, testsCount, appointmentsCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.psychologistProfile.count(),
      prisma.clientProfile.count(),
      prisma.test.count(),
      prisma.appointment.count()
    ]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Админ-панель</h1>
      <p className="text-sm text-muted-foreground">
        Базовый обзор ключевых сущностей CRM. Разделы пользователей и
        диагностики доступны через ссылки ниже.
      </p>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="card p-4 space-y-1">
          <div className="text-xs text-muted-foreground uppercase">Пользователи</div>
          <div className="text-2xl font-semibold text-foreground">
            {usersCount}
          </div>
        </div>
        <div className="card p-4 space-y-1">
          <div className="text-xs text-muted-foreground uppercase">Психологи</div>
          <div className="text-2xl font-semibold text-foreground">
            {psychologistsCount}
          </div>
        </div>
        <div className="card p-4 space-y-1">
          <div className="text-xs text-muted-foreground uppercase">Клиенты</div>
          <div className="text-2xl font-semibold text-foreground">
            {clientsCount}
          </div>
        </div>
        <div className="card p-4 space-y-1">
          <div className="text-xs text-muted-foreground uppercase">Тесты</div>
          <div className="text-2xl font-semibold text-foreground">
            {testsCount}
          </div>
        </div>
        <div className="card p-4 space-y-1">
          <div className="text-xs text-muted-foreground uppercase">Записи</div>
          <div className="text-2xl font-semibold text-foreground">
            {appointmentsCount}
          </div>
        </div>
      </div>

      <div className="card p-4 space-y-2 text-sm text-muted-foreground">
        <div className="font-medium text-foreground">Разделы админки</div>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <Link
              href="/admin/users"
              className="text-primary/90 transition-colors hover:text-primary"
            >
              Пользователи и роли
            </Link>
          </li>
          <li>
            <Link
              href="/admin/diagnostics"
              className="text-primary/90 transition-colors hover:text-primary"
            >
              Диагностика и тесты
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}

