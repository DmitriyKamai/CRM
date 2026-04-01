import { redirect } from "next/navigation";
import { getCachedAppSession } from "@/lib/server-session";
import { getPlatformModuleFlags } from "@/lib/platform-modules";
import { SettingsPageEntry } from "./settings-page-entry";

export default async function SettingsPage() {
  const session = await getCachedAppSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/settings");
  }

  const role = (session.user as { role?: string }).role;

  if (role === "ADMIN") {
    redirect("/admin");
  }

  if (role !== "CLIENT" && role !== "PSYCHOLOGIST") {
    redirect("/");
  }

  const modules = await getPlatformModuleFlags();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-3xl space-y-4 xl:max-w-4xl">
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Настройки профиля</h1>
        <p className="text-sm text-muted-foreground">
          {role === "PSYCHOLOGIST"
            ? "Личные данные, безопасность, аккаунты и календарь — по вкладкам."
            : "Личные данные, безопасность и привязка аккаунтов — по вкладкам."}
        </p>
        <SettingsPageEntry role={role} schedulingEnabled={modules.scheduling} />
      </div>
    </div>
  );
}
