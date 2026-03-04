import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { UsersTable } from "@/components/admin/users-table";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/admin/users");
  }

  if ((session.user as any).role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-50">
        Пользователи и роли
      </h1>
      <p className="text-sm text-slate-300">
        Здесь можно просматривать зарегистрированных пользователей и изменять их
        роль (клиент, психолог, админ).
      </p>
      <div className="card p-4">
        <UsersTable />
      </div>
    </div>
  );
}

