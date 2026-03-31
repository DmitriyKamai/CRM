import { redirect } from "next/navigation";
import { getCachedAppSession } from "@/lib/server-session";
import { ClientSettingsLoader } from "./settings-loader";

export default async function ClientSettingsPage() {
  const session = await getCachedAppSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/client/settings");
  }

  if ((session.user as { role?: string }).role !== "CLIENT") {
    redirect("/");
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Настройки профиля</h1>
      <p className="text-sm text-muted-foreground">
        Личные данные, безопасность и привязка аккаунтов — по вкладкам.
      </p>
      <ClientSettingsLoader />
    </div>
  );
}
