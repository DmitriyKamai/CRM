import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { PsychologistSchedule } from "@/components/schedule/psychologist-schedule";
import { CalendarSubscriptionBlock } from "@/components/schedule/calendar-subscription";

export default async function PsychologistSchedulePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/psychologist/schedule");
  }

  if ((session.user as any).role !== "PSYCHOLOGIST") {
    redirect("/");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-50">
        Расписание приёмов
      </h1>
      <p className="text-sm text-slate-300">
        Здесь вы можете создавать слоты в расписании, которые будут доступны
        клиентам для записи.
      </p>
      <CalendarSubscriptionBlock />
      <PsychologistSchedule />
    </div>
  );
}

