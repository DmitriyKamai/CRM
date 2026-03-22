import { AppShell } from "@/components/layout/app-shell";
import { getPlatformModuleFlags } from "@/lib/platform-modules";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const modules = await getPlatformModuleFlags();
  return (
    <AppShell role="CLIENT" modules={modules}>
      {children}
    </AppShell>
  );
}
