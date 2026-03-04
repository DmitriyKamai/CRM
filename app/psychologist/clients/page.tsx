import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { PsychologistClientsList } from "@/components/psychologist/clients-list";

export default async function PsychologistClientsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/psychologist/clients");
  }

  if ((session.user as any).role !== "PSYCHOLOGIST") {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Клиенты</h1>
        <p className="text-sm text-muted-foreground">
          Список ваших клиентов и форма для добавления новых.
        </p>
      </section>

      <PsychologistClientsList />
    </div>
  );
}

