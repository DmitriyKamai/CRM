import { redirect } from "next/navigation";

import { getPlatformModuleFlags } from "@/lib/platform-modules";

export default async function PsychologistScheduleLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const flags = await getPlatformModuleFlags();
  if (!flags.scheduling) {
    redirect("/psychologist");
  }
  return <>{children}</>;
}
