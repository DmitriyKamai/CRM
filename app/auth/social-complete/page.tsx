import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Props = {
  searchParams: {
    role?: string;
    from?: string;
  };
};

export default async function SocialCompletePage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login");
  }

  const userId = (session.user as any).id as string | undefined;
  if (!userId) {
    redirect("/");
  }

  const roleParam = searchParams.role === "psychologist" ? "psychologist" : "client";

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      psychologistProfile: { select: { id: true } },
      clientProfiles: { select: { id: true } }
    }
  });

  if (!user) {
    redirect("/auth/login");
  }

  // Если роль уже выбрана (или есть профиль) — не даём менять её руками через URL.
  if (user.psychologistProfile || user.clientProfiles.length > 0) {
    if (user.psychologistProfile) {
      redirect("/psychologist");
    }
    redirect("/client");
  }

  // Роль ещё не зафиксирована: разрешаем один раз выбрать.
  if (roleParam === "psychologist") {
    await prisma.user.update({
      where: { id: userId },
      data: {
        role: "PSYCHOLOGIST",
        psychologistProfile: {
          connectOrCreate: {
            where: { userId },
            create: {
              firstName: session.user.name ?? "Психолог",
              lastName: ""
            }
          }
        }
      }
    });
    redirect("/psychologist");
  }

  // client
  await prisma.user.update({
    where: { id: userId },
    data: { role: "CLIENT" }
  });
  redirect("/client");
}

