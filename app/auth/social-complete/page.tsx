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
  console.log("[social-complete] searchParams.role:", searchParams.role, "roleParam:", roleParam);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      email: true,
      name: true,
      psychologistProfile: { select: { id: true } },
      clientProfiles: { select: { id: true } }
    }
  });

  if (!user) {
    redirect("/auth/login");
  }

  console.log("[social-complete] userId:", userId, "user.role:", user.role, "psychologistProfile:", !!user.psychologistProfile, "clientProfiles:", user.clientProfiles.length);

  // Если роль уже выбрана (или есть профиль) — не даём менять её руками через URL.
  if (user.psychologistProfile || user.clientProfiles.length > 0) {
    console.log("[social-complete] already has profile, redirecting");
    if (user.psychologistProfile) {
      redirect("/psychologist");
    }
    redirect("/client");
  }

  // Роль ещё не зафиксирована: разрешаем один раз выбрать.
  if (roleParam === "psychologist") {
    console.log("[social-complete] applying PSYCHOLOGIST for userId:", userId);
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
    console.log("[social-complete] psychologist profile created, redirecting to /psychologist");
    redirect("/psychologist");
  }

  // client
  console.log("[social-complete] applying CLIENT for userId:", userId);
  const nameParts = (user.name ?? "").trim().split(/\s+/);
  const firstName = nameParts[0] || "Клиент";
  const lastName = nameParts.slice(1).join(" ");

  await prisma.$transaction(async tx => {
    await tx.user.update({
      where: { id: userId },
      data: { role: "CLIENT" }
    });
    await tx.clientProfile.create({
      data: {
        userId,
        email: user.email ?? null,
        firstName,
        lastName
      }
    });
  });
  redirect("/client");
}

