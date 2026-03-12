import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/admin");
  }

  if ((session.user as any).role !== "ADMIN") {
    redirect("/");
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
      <h1 className="text-xl font-semibold text-slate-50">Админ-панель</h1>
      <p className="text-sm text-slate-300">
        Базовый обзор ключевых сущностей CRM. Разделы пользователей и
        диагностики доступны через ссылки ниже.
      </p>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="card p-4 space-y-1">
          <div className="text-xs text-slate-400 uppercase">Пользователи</div>
          <div className="text-2xl font-semibold text-slate-50">
            {usersCount}
          </div>
        </div>
        <div className="card p-4 space-y-1">
          <div className="text-xs text-slate-400 uppercase">Психологи</div>
          <div className="text-2xl font-semibold text-slate-50">
            {psychologistsCount}
          </div>
        </div>
        <div className="card p-4 space-y-1">
          <div className="text-xs text-slate-400 uppercase">Клиенты</div>
          <div className="text-2xl font-semibold text-slate-50">
            {clientsCount}
          </div>
        </div>
        <div className="card p-4 space-y-1">
          <div className="text-xs text-slate-400 uppercase">Тесты</div>
          <div className="text-2xl font-semibold text-slate-50">
            {testsCount}
          </div>
        </div>
        <div className="card p-4 space-y-1">
          <div className="text-xs text-slate-400 uppercase">Записи</div>
          <div className="text-2xl font-semibold text-slate-50">
            {appointmentsCount}
          </div>
        </div>
      </div>

      <div className="card p-4 space-y-2 text-sm text-slate-200">
        <div className="font-medium text-slate-50">Разделы админки</div>
        <ul className="list-disc list-inside space-y-1 text-slate-300">
          <li>
            <a href="/admin/users" className="text-sky-400 hover:underline">
              Пользователи и роли
            </a>
          </li>
          <li>
            <a
              href="/admin/diagnostics"
              className="text-sky-400 hover:underline"
            >
              Диагностика и тесты
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}

