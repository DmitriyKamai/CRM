import { redirect } from "next/navigation";
import { getCachedAppSession } from "@/lib/server-session";
import { PsychologistDiagnosticsClient } from "@/components/psychologist/diagnostics-client";

export const dynamic = "force-dynamic";

export default async function PsychologistDiagnosticsPage() {
  const session = await getCachedAppSession();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/psychologist/diagnostics");
  }

  if ((session.user as unknown as { role?: string | null }).role !== "PSYCHOLOGIST") {
    redirect("/");
  }

  return (
    <div className="min-w-0 p-4 sm:p-6">
      <PsychologistDiagnosticsClient />
    </div>
  );
}

