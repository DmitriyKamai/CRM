import { AppShell } from "@/components/layout/app-shell";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="CLIENT">{children}</AppShell>;
}
