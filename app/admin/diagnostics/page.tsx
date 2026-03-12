import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { TestsTable } from "@/components/admin/tests-table";

export default async function AdminDiagnosticsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/admin/diagnostics");
  }

  if ((session.user as any).role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold text-slate-50">
        Диагностические тесты
      </h1>
      <p className="text-sm text-slate-300">
        Просмотр и управление доступностью психологических тестов (включение /
        отключение).
      </p>
      <div className="card p-4">
        <TestsTable />
      </div>
    </div>
  );
}

