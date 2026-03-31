import { getCachedAppSession } from "@/lib/server-session";
import { prisma } from "@/lib/db";
import { getPlatformModuleFlags } from "@/lib/platform-modules";
import { PsychologistDashboardClient } from "@/components/psychologist/psychologist-dashboard-client";

export default async function PsychologistDashboardPage() {
  const [modules, session] = await Promise.all([
    getPlatformModuleFlags(),
    getCachedAppSession()
  ]);

  let clientsCount = 0;
  let upcomingCount = 0;

  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (userId) {
    try {
      const profile = await prisma.psychologistProfile.findUnique({
        where: { userId },
        select: { id: true }
      });
      if (profile) {
        const [cc, uc] = await Promise.all([
          prisma.clientProfile.count({ where: { psychologistId: profile.id } }),
          modules.scheduling
            ? prisma.appointment.count({
                where: {
                  psychologistId: profile.id,
                  start: { gte: new Date() },
                  status: { in: ["SCHEDULED", "PENDING_CONFIRMATION"] }
                }
              })
            : 0
        ]);
        clientsCount = cc;
        upcomingCount = uc;
      }
    } catch {
      // статистика некритична — дашборд рендерится и без неё
    }
  }

  return (
    <PsychologistDashboardClient
      schedulingEnabled={modules.scheduling}
      diagnosticsEnabled={modules.diagnostics}
      initialClientsCount={clientsCount}
      initialUpcomingCount={upcomingCount}
    />
  );
}
