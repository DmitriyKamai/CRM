import { redirect } from "next/navigation";
import { getCachedAppSession } from "@/lib/server-session";
import { prisma } from "@/lib/db";
import { allocatePublicRouteSerial } from "@/lib/psychologist-public-route-serial";

type Props = {
  searchParams: Promise<{ role?: string; from?: string }>;
};

export default async function SocialCompletePage({ searchParams }: Props) {
  const session = await getCachedAppSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const userId = (session.user as unknown as { id?: string }).id;
  if (!userId) {
    redirect("/");
  }

  const params = await searchParams;
  const roleParam = params.role === "psychologist" ? "psychologist" : "client";

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

  // Если роль уже выбрана (или есть профиль) — не даём менять её руками через URL.
  if (user.psychologistProfile || user.clientProfiles.length > 0) {
    if (user.psychologistProfile) {
      redirect("/psychologist");
    }
    redirect("/client");
  }

  // Роль ещё не зафиксирована: разрешаем один раз выбрать.
  if (roleParam === "psychologist") {
    const fullName = (session.user.name ?? user.name ?? "Психолог").trim();
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] ?? "Психолог";
    const lastName = nameParts.slice(1).join(" ") ?? "";
    await prisma.$transaction(async (tx) => {
      const existing = await tx.psychologistProfile.findUnique({
        where: { userId }
      });
      if (existing) {
        await tx.user.update({
          where: { id: userId },
          data: { role: "PSYCHOLOGIST", firstName, lastName }
        });
        return;
      }
      const serial = await allocatePublicRouteSerial(tx);
      await tx.user.update({
        where: { id: userId },
        data: {
          role: "PSYCHOLOGIST",
          firstName,
          lastName,
          psychologistProfile: {
            create: { publicRouteSerial: serial }
          }
        }
      });
    });
    redirect("/psychologist");
  }

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

