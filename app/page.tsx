import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (session?.user && role === "UNSPECIFIED") {
    redirect("/auth/choose-role");
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8">
      <section className="text-center space-y-4 max-w-2xl">
        <h1 className="text-6xl md:text-7xl font-semibold text-slate-50 tangerine-bold">
          Empatix
        </h1>
        <p className="text-slate-300">
          Регистрация психологов и клиентов, опросник Шмишека, расписание приёмов
          и безопасное хранение персональных данных.
        </p>
      </section>

      <section className="flex flex-wrap items-center justify-center gap-4">
        <Button asChild>
          <Link href="/auth/login">Войти</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/auth/register/psychologist">Я психолог</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/auth/register/client">Я клиент</Link>
        </Button>
      </section>
    </div>
  );
}

