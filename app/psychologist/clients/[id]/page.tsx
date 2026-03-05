import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PsychologistClientProfile } from "@/components/psychologist/client-profile";

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

  if ((session.user as any).role !== "PSYCHOLOGIST") {
    redirect("/");
  }

  const userId = (session.user as any).id as string;

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
    include: {
      user: {
        select: {
          email: true
        }
      }
    }
  });

  if (!client) {
    notFound();
  }

  const email = client.user?.email ?? client.email ?? null;
  const hasAccount = !!client.userId;

  const testResults = await prisma.testResult.findMany({
    where: {
      AND: [
        { clientId: client.id },
        {
          OR: [
            { psychologistId: psych.id },
            { psychologistId: null }
          ]
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
  });

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Профиль клиента
        </h1>
        <p className="text-sm text-muted-foreground">
          Редактирование основных данных клиента.
        </p>
      </section>

      <PsychologistClientProfile
        id={client.id}
        email={email}
        hasAccount={hasAccount}
        firstName={client.firstName}
        lastName={client.lastName}
        dateOfBirth={client.dateOfBirth?.toISOString() ?? null}
        phone={client.phone ?? null}
        notes={client.notes ?? null}
        createdAt={client.createdAt.toISOString()}
        diagnostics={testResults.map(r => ({
          id: r.id,
          testTitle: r.test.title,
          createdAt: r.createdAt.toISOString(),
          interpretation: r.interpretation ?? null
        }))}
      />
    </div>
  );
}

