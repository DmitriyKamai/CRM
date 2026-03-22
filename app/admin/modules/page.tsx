import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { ModulesSettingsClient } from "@/components/admin/modules-settings-client";

export default async function AdminModulesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/admin/modules");
  }
  if ((session.user as { role?: string }).role !== "ADMIN") {
    redirect("/?forbidden=1");
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Модули продукта</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Глобальное включение и выключение крупных блоков CRM для всех пользователей.
        </p>
      </div>
      <ModulesSettingsClient />
    </div>
  );
}
