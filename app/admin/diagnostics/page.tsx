import Link from "next/link";
import { redirect } from "next/navigation";
import { getCachedAppSession } from "@/lib/server-session";
import { TestsTable } from "@/components/admin/tests-table";
import { getPlatformModuleFlags } from "@/lib/platform-modules";

export default async function AdminDiagnosticsPage() {
  const session = await getCachedAppSession();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/admin/diagnostics");
  }

  if ((session.user as unknown as { role?: string | null }).role !== "ADMIN") {
    redirect("/?forbidden=1");
  }

  const modules = await getPlatformModuleFlags();
  if (!modules.diagnostics) {
    return (
      <div className="p-6 space-y-4 max-w-lg">
        <h1 className="text-xl font-semibold text-foreground">Диагностические тесты</h1>
        <p className="text-sm text-muted-foreground">
          Модуль психодиагностики выключен. Включите его в настройках модулей, чтобы снова
          управлять тестами и отдавать данные через API.
        </p>
        <Link
          href="/admin/modules"
          className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Настройки модулей
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold text-foreground">
        Диагностические тесты
      </h1>
      <p className="text-sm text-muted-foreground">
        Просмотр и управление доступностью психологических тестов (включение /
        отключение).
      </p>
      <div className="card p-4">
        <TestsTable />
      </div>
    </div>
  );
}

