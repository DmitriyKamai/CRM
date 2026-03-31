import { redirect } from "next/navigation";
import { getCachedAppSession } from "@/lib/server-session";
import { PsychologistSchedule } from "@/components/schedule/psychologist-schedule";

export default async function PsychologistSchedulePage() {
  const session = await getCachedAppSession();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/psychologist/schedule");
  }

  if ((session.user as unknown as { role?: string | null }).role !== "PSYCHOLOGIST") {
    redirect("/");
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
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

