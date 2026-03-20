import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { AuditLogTable } from "@/components/admin/audit-log-table";

export default async function AdminAuditLogPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/admin/audit-log");
  }

  if ((session.user as unknown as { role?: string | null }).role !== "ADMIN") {
    redirect("/?forbidden=1");
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Аудит действий пользователей</h1>
      <p className="text-sm text-muted-foreground">
        Просмотр критичных действий: смена ролей, перевыпуск календарных
        ссылок, смена пароля и др.
      </p>

      <div className="card p-4">
        <AuditLogTable />
      </div>
    </div>
  );
}

