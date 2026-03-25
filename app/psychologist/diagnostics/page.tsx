import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { PsychologistDiagnosticsClient } from "@/components/psychologist/diagnostics-client";

export const dynamic = "force-dynamic";

export default async function PsychologistDiagnosticsPage() {
  const session = await getServerSession(authOptions);

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

