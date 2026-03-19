import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { PsychologistSchedule } from "@/components/schedule/psychologist-schedule";

export default async function PsychologistSchedulePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/psychologist/schedule");
  }

  if ((session.user as unknown as { role?: string | null }).role !== "PSYCHOLOGIST") {
    redirect("/");
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold text-foreground">
        Расписание приёмов
      </h1>
      <p className="text-sm text-muted-foreground">
        Здесь вы можете создавать слоты в расписании, которые будут доступны
        клиентам для записи.
      </p>
      <PsychologistSchedule />
    </div>
  );
}

