import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ClientBooking } from "@/components/schedule/client-booking";

type ParamsPromise = { params: Promise<{ id: string }> };

function isRedirectError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "digest" in err && String((err as { digest?: string }).digest ?? "").includes("NEXT_REDIRECT");
}

export default async function PsychologistBookingPage({ params }: ParamsPromise) {
  const { id } = await params;

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      redirect(
        `/auth/login?callbackUrl=/client/psychologists/${encodeURIComponent(id)}`
      );
    }

    if ((session.user as any).role !== "CLIENT") {
      redirect("/");
    }

    const psychologist = await prisma.psychologistProfile.findUnique({
      where: { id }
    });

    if (!psychologist) {
      redirect("/client/psychologists");
    }

    const fullName = `${psychologist.lastName} ${psychologist.firstName}`;

    return (
      <div className="space-y-4">
        <ClientBooking
          psychologistId={psychologist.id}
          psychologistName={fullName}
        />
      </div>
    );
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("Psychologist booking page error:", err);
    return (
      <div className="space-y-4 rounded-lg border border-amber-700/60 bg-amber-950/40 p-6 text-amber-200">
        <p className="font-medium">Ошибка загрузки страницы</p>
        <p className="text-sm">
          {err instanceof Error ? err.message : "Попробуйте обновить страницу или перейти к списку психологов."}
        </p>
        <a href="/client/psychologists" className="text-sm underline">
          К списку психологов
        </a>
      </div>
    );
  }
}

