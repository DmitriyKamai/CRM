import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ClientSettingsLoader } from "./settings-loader";

export default async function ClientSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/client/settings");
  }

  if ((session.user as { role?: string }).role !== "CLIENT") {
    redirect("/");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Настройки профиля</h1>
      <p className="text-sm text-muted-foreground">
        Личные данные, безопасность и привязка аккаунтов — по вкладкам.
      </p>
      <ClientSettingsLoader />
    </div>
  );
}
