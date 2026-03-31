import { redirect } from "next/navigation";
import { getCachedAppSession } from "@/lib/server-session";
import { getPlatformModuleFlags } from "@/lib/platform-modules";
import { PsychologistClientsList } from "@/components/psychologist/clients-list";

export default async function PsychologistClientsPage() {
  const session = await getCachedAppSession();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/psychologist/clients");
  }

  if ((session.user as unknown as { role?: string | null }).role !== "PSYCHOLOGIST") {
    redirect("/");
  }

  const modules = await getPlatformModuleFlags();

  return (
    <PsychologistClientsList
      schedulingEnabled={modules.scheduling}
      diagnosticsEnabled={modules.diagnostics}
    />
  );
}

