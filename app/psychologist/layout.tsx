import { AppShell } from "@/components/layout/app-shell";
import { getPlatformModuleFlags } from "@/lib/platform-modules";

export default async function PsychologistLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const modules = await getPlatformModuleFlags();
  return (
    <AppShell role="PSYCHOLOGIST" modules={modules}>
      {children}
    </AppShell>
  );
}
