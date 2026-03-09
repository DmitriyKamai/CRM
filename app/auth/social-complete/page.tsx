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
    select: { role: true }
  });

  if (!user) {
    redirect("/auth/login");
  }

  if (roleParam === "psychologist") {
    if (user.role !== "PSYCHOLOGIST") {
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
    }
    redirect("/psychologist");
  }

  // client
  if (user.role !== "CLIENT") {
    await prisma.user.update({
      where: { id: userId },
      data: { role: "CLIENT" }
    });
  }

  redirect("/client");
}

