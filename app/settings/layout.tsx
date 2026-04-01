import { AppShell } from "@/components/layout/app-shell";
import { PsychologistSessionGuard } from "@/components/psychologist/psychologist-session-guard";
import { getCachedAppSession } from "@/lib/server-session";
import { getPlatformModuleFlags } from "@/lib/platform-modules";

/**
 * Единый URL `/settings` вне сегментов `client/` и `psychologist/`,
 * поэтому здесь повторяем оболочку кабинета по роли из сессии.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getCachedAppSession();
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (role === "CLIENT" || role === "PSYCHOLOGIST") {
    const modules = await getPlatformModuleFlags();
    return (
      <AppShell role={role} modules={modules}>
        {role === "PSYCHOLOGIST" ? <PsychologistSessionGuard /> : null}
        {children}
      </AppShell>
    );
  }

  return <>{children}</>;
}
