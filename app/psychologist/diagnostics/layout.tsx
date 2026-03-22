import { redirect } from "next/navigation";

import { getPlatformModuleFlags } from "@/lib/platform-modules";

export default async function PsychologistDiagnosticsLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const flags = await getPlatformModuleFlags();
  if (!flags.diagnostics) {
    redirect("/psychologist");
  }
  return <>{children}</>;
}
