import { AppShell } from "@/components/layout/app-shell";
import { getPlatformModuleFlags } from "@/lib/platform-modules";

/** Публичные страницы психологов в корне сайта (`/{slug}` или `/{id}`) — тот же каркас, что у клиента. */
export default async function PublicPsychologistProfileLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const modules = await getPlatformModuleFlags();
  return (
    <AppShell role="CLIENT" modules={modules}>
      {children}
    </AppShell>
  );
}
