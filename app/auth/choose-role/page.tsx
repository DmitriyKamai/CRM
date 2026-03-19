import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";

export default async function ChooseRolePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login");
  }

  const userId = (session.user as unknown as { id?: string }).id;
  if (!userId) {
    redirect("/auth/login");
  }

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

  console.log("[choose-role] userId:", userId, "user.role:", user.role, "psychologistProfile:", !!user.psychologistProfile, "clientProfiles:", user.clientProfiles.length);

  // Если роль уже выбрана — сразу ведём в соответствующий кабинет.
  // Новый соц-пользователь после первого логина имеет role=CLIENT, но без профилей —
  // в этом случае выбор роли ещё не сделан, и мы показываем экран выбора.
  if (user.role === "ADMIN") {
    redirect("/admin");
  }
  if (user.role === "PSYCHOLOGIST" || user.psychologistProfile) {
    console.log("[choose-role] redirect to /psychologist (role or profile)");
    redirect("/psychologist");
  }
  if (user.role === "CLIENT" && user.clientProfiles.length > 0) {
    console.log("[choose-role] redirect to /client (role + profiles)");
    redirect("/client");
  }

  // Новый пользователь по соцлогину: просим выбрать роль.
  console.log("[choose-role] showing role selection form");
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Кто вы?</h1>
        <p className="text-sm text-muted-foreground">
          Выберите роль, с которой вы будете использовать Empatix.
        </p>
        <div className="flex flex-col gap-3 pt-2">
          <form action="/auth/social-complete" method="GET">
            <input type="hidden" name="role" value="client" />
            <Button type="submit" className="w-full" variant="outline">
              Я клиент
            </Button>
          </form>
          <form action="/auth/social-complete" method="GET">
            <input type="hidden" name="role" value="psychologist" />
            <Button type="submit" className="w-full" variant="outline">
              Я психолог
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

