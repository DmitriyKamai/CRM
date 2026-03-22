import { AppShell } from "@/components/layout/app-shell";
import { getPlatformModuleFlags } from "@/lib/platform-modules";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const modules = await getPlatformModuleFlags();
  return (
    <AppShell role="ADMIN" modules={modules}>
      {children}
    </AppShell>
  );
}
