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
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="tangerine-bold text-5xl text-foreground leading-none">
            Empatix
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild size="sm">
              <Link href="/auth/login">Войти</Link>
            </Button>
            <Button variant="outline" asChild size="sm">
              <Link href="/auth/register/psychologist">Я психолог</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth/register/client">Я клиент</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-10 px-4 py-16">
        <section className="text-center space-y-5 max-w-2xl">
          <h1 className="text-7xl md:text-8xl font-semibold tangerine-bold leading-none">
            Empatix
          </h1>
          <p className="text-base text-muted-foreground max-w-md mx-auto">
            CRM для психологов: клиенты, расписание, диагностика
            и безопасное хранение персональных данных.
          </p>
        </section>

        <section className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/auth/register/psychologist">Начать как психолог</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/auth/login">Войти в аккаунт</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}

