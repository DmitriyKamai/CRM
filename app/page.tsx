import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { HeaderNav } from "@/components/layout/header-nav";
import { Alert, AlertDescription } from "@/components/ui/alert";

/** Next.js 16: `searchParams` на странице — только `Promise` (см. валидацию в `.next/types`). */
type LandingPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LandingPage({ searchParams }: LandingPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const forbiddenParam = resolvedParams?.forbidden;

  const showForbiddenNotice =
    forbiddenParam === "1" ||
    (Array.isArray(forbiddenParam) && forbiddenParam.includes("1"));

  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (session?.user && role === "UNSPECIFIED") {
    redirect("/auth/choose-role");
  }
  if (session?.user && role === "ADMIN") {
    redirect("/admin");
  }

  const dashboard =
    session?.user && role
      ? role === "CLIENT"
        ? { href: "/client", label: "Кабинет клиента" }
        : role === "PSYCHOLOGIST"
          ? { href: "/psychologist", label: "Кабинет психолога" }
          : null
      : null;

  if (session?.user && !dashboard) {
    // На всякий случай: если роль неизвестна, ведём на выбор роли.
    redirect("/auth/choose-role");
  }

  const authenticatedRole =
    role === "CLIENT" ? "CLIENT" : role === "PSYCHOLOGIST" ? "PSYCHOLOGIST" : null;

  type UserWithName = { name?: string | null };
  const userLabel =
    session?.user?.email ??
    (session?.user as UserWithName)?.name ??
    "Пользователь";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {authenticatedRole ? (
        <HeaderNav
          role={authenticatedRole}
          brand={{ href: "/", label: "Empatix" }}
        />
      ) : (
        <header className="rounded-none border-x-0 border-t-0 border-b border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-bg))]">
          <div className="mx-auto flex min-w-0 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:gap-4">
            <Link
              href="/"
              className="tangerine-bold min-w-0 shrink text-4xl text-foreground leading-none sm:text-5xl"
            >
              Empatix
            </Link>
            <nav className="flex min-w-0 flex-wrap items-center justify-end gap-2">
              <>
                <Button variant="ghost" asChild size="sm">
                  <Link href="/auth/login">Войти</Link>
                </Button>
                <Button variant="outline" asChild size="sm">
                  <Link href="/auth/register/psychologist">Я психолог</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/auth/register/client">Я клиент</Link>
                </Button>
              </>
            </nav>
          </div>
        </header>
      )}

      <main className="flex-1 flex flex-col items-center justify-center gap-10 px-4 py-16">
        {showForbiddenNotice && (
          <Alert variant="destructive" className="max-w-2xl w-full">
            <AlertDescription>
              У вас нет доступа к запрошенному разделу. Откройте доступный кабинет через кнопку ниже.
            </AlertDescription>
          </Alert>
        )}
        <section className="text-center space-y-5 max-w-2xl">
          <h1 className="text-7xl md:text-8xl font-semibold tangerine-bold leading-none">
            Empatix
          </h1>
          <p className="text-base text-muted-foreground max-w-md mx-auto">
            CRM для психологов: клиенты, расписание, диагностика
            и безопасное хранение персональных данных.
          </p>
        </section>

        {dashboard ? (
          <section className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href={dashboard.href}>Перейти в кабинет</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/auth/choose-role">Сменить роль</Link>
            </Button>
            <p className="w-full max-w-full px-1 text-center text-sm break-words text-muted-foreground">
              Вы вошли: {userLabel}
            </p>
          </section>
        ) : (
          <section className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/auth/register/psychologist">Начать как психолог</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/auth/login">Войти в аккаунт</Link>
            </Button>
          </section>
        )}
      </main>
    </div>
  );
}

