import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getPlatformModuleFlags } from "@/lib/platform-modules";

import { PsychologistSettingsEntry } from "./psychologist-settings-entry";

export default async function PsychologistSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/psychologist/settings");
  }

  if ((session.user as { role?: string }).role !== "PSYCHOLOGIST") {
    redirect("/");
  }

  const modules = await getPlatformModuleFlags();

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <h1 className="text-xl font-semibold text-foreground">Настройки профиля</h1>
        <p className="text-sm text-muted-foreground">
          Личные данные, безопасность, аккаунты и календарь — по вкладкам.
        </p>
        <PsychologistSettingsEntry schedulingEnabled={modules.scheduling} />
      </div>
    </div>
  );
}
