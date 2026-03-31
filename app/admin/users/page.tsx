import { redirect } from "next/navigation";
import { getCachedAppSession } from "@/lib/server-session";
import { UsersTable } from "@/components/admin/users-table";

export default async function AdminUsersPage() {
  const session = await getCachedAppSession();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/admin/users");
  }

  if ((session.user as unknown as { role?: string | null }).role !== "ADMIN") {
    redirect("/?forbidden=1");
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold text-foreground">
        Пользователи и роли
      </h1>
      <p className="text-sm text-muted-foreground">
        Здесь можно просматривать зарегистрированных пользователей и изменять их
        роль (клиент, психолог, админ).
      </p>
      <div className="card p-4">
        <UsersTable />
      </div>
    </div>
  );
}

