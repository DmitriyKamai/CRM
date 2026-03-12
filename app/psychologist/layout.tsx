import { AppShell } from "@/components/layout/app-shell";

export default function PsychologistLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="PSYCHOLOGIST">{children}</AppShell>;
}
