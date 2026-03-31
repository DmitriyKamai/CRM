import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PsychologistClientProfile } from "@/components/psychologist/client-profile";
import { getPlatformModuleFlags } from "@/lib/platform-modules";
import { decryptClientNotesFromDb } from "@/lib/server-encryption/client-profile-storage";
import { decryptTestResultInterpretationFromDb } from "@/lib/server-encryption/test-result-storage";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PsychologistClientProfilePage({
  params
}: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect(`/auth/login?callbackUrl=/psychologist/clients/${id}`);
  }

  if ((session.user as unknown as { role?: string | null }).role !== "PSYCHOLOGIST") {
    redirect("/");
  }

  const userId = (session.user as unknown as { id?: string }).id;
  if (!userId) {
    redirect(`/auth/login?callbackUrl=/psychologist/clients/${id}`);
  }

  const psych = await prisma.psychologistProfile.findUnique({
    where: { userId },
    select: { id: true }
  });

  if (!psych) {
    notFound();
  }

  const client = await prisma.clientProfile.findFirst({
    where: {
      id,
      psychologistId: psych.id
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      phone: true,
      notes: true,
      createdAt: true,
      userId: true,
      email: true,
      user: { select: { email: true } },
      status: { select: { id: true, label: true, color: true } }
    }
  });

  if (!client) {
    notFound();
  }

  // Опциональные поля могли не быть в миграциях на части окружений — запрашиваем отдельно при необходимости
  let country: string | null = null;
  let city: string | null = null;
  let gender: string | null = null;
  let maritalStatus: string | null = null;
  try {
    const extra = await prisma.clientProfile.findFirst({
      where: { id, psychologistId: psych.id },
      select: { country: true, city: true, gender: true, maritalStatus: true }
    });
    if (extra) {
      country = extra.country;
      city = extra.city;
      gender = extra.gender;
      maritalStatus = extra.maritalStatus;
    }
  } catch {
    // колонки могут отсутствовать
  }

  const email = client.user?.email ?? client.email ?? null;
  const hasAccount = !!client.userId;

  const modules = await getPlatformModuleFlags();

  const testResults = modules.diagnostics
    ? await prisma.testResult.findMany({
        where: {
          AND: [
            { clientId: client.id },
            {
              OR: [{ psychologistId: psych.id }, { psychologistId: null }]
            }
          ]
        },
        include: {
          test: {
            select: {
              title: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 20
      })
    : [];

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      <section className="space-y-1 min-w-0">
        <h1 className="text-xl font-semibold tracking-tight">
          Профиль клиента
        </h1>
        <p className="text-sm text-muted-foreground">
          Редактирование основных данных клиента.
        </p>
      </section>

      <PsychologistClientProfile
        id={client.id}
        schedulingEnabled={modules.scheduling}
        diagnosticsEnabled={modules.diagnostics}
        email={email}
        hasAccount={hasAccount}
        firstName={client.firstName}
        lastName={client.lastName}
        dateOfBirth={client.dateOfBirth?.toISOString() ?? null}
        phone={client.phone ?? null}
        country={country}
        city={city}
        gender={gender}
        maritalStatus={maritalStatus}
        notes={decryptClientNotesFromDb(client.notes)}
        createdAt={client.createdAt.toISOString()}
        statusId={client.status?.id ?? null}
        statusLabel={client.status?.label ?? null}
        statusColor={client.status?.color ?? null}
        diagnostics={testResults.map(r => ({
          id: r.id,
          testTitle: r.test?.title ?? "Диагностика",
          createdAt: r.createdAt.toISOString(),
          interpretation: decryptTestResultInterpretationFromDb(r.interpretation)
        }))}
      />
    </div>
  );
}

