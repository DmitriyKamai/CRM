import Link from "next/link";
import { redirect } from "next/navigation";
import { getCachedAppSession } from "@/lib/server-session";
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

  const session = await getCachedAppSession();
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

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <Link href="/" className="tangerine-bold text-4xl leading-none sm:text-5xl">
              Empatix
            </Link>
            <nav className="flex items-center gap-2">
              <Button variant="ghost" asChild size="sm">
                <Link href="/auth/login">Войти</Link>
              </Button>
              <Button variant="outline" asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/auth/register/psychologist">Я психолог</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/auth/register/client">Начать</Link>
              </Button>
            </nav>
          </div>
        </header>

        <main>
          <section className="relative overflow-hidden">
            <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />
            <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-2 lg:items-center lg:py-20">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border bg-muted/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  Безопасно и удобно
                </div>
                <h1 className="text-balance text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                  Спокойствие в практике, фокус на человеке
                </h1>
                <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  Единая система для учета клиентов, расписания и диагностики.
                  Создана специально для психологов и психотерапевтов.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button size="lg" asChild>
                    <Link href="/auth/register/psychologist">Начать бесплатно</Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/catalog">Посмотреть каталог</Link>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                  <span>Сквозное шифрование</span>
                  <span>Авто-бэкапы</span>
                  <span>Доступ с любого устройства</span>
                </div>
              </div>
              <div className="relative">
                <div className="rounded-3xl border bg-card p-2 shadow-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDnPgCaTGKDxJjkWz_kd5dPiiplmpHh_O4bIvpXf0rJTzi9xI6j7898tlw4e6V2W35-PXuuLFqwSi7G51_QJkYeRSBxUyWljO06z5J6BP2GcmzSmVA-O-NUnN15LBw0OCrT2seAmTRNB3sNhWjUssAZ5TOgIJaLogRGiZDz0tR-IHdGaz_o_bapZPWyu8GrTwJC4r9DjEejFbbVb5CoCFObD3Wk5STBOs7z3rA3mB2wTEjZLU2HfZajn42eAaHFEzB2T10eAUcB7N4G"
                    alt="Интерфейс Empatix"
                    className="aspect-[4/3] w-full rounded-2xl object-cover"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-muted/30 py-14">
            <div className="mx-auto max-w-7xl px-4">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-semibold sm:text-3xl">Почему Empatix</h2>
                <p className="mt-2 text-muted-foreground">
                  Всё необходимое для частной практики в одном месте.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <article className="rounded-2xl border bg-card p-6">
                  <h3 className="text-lg font-semibold">Безопасность данных</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Чувствительные данные клиента защищены шифрованием и политиками
                    доступа.
                  </p>
                </article>
                <article className="rounded-2xl border bg-card p-6">
                  <h3 className="text-lg font-semibold">Умное расписание</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Слоты, напоминания и запись клиента синхронизированы в одном
                    потоке.
                  </p>
                </article>
                <article className="rounded-2xl border bg-card p-6">
                  <h3 className="text-lg font-semibold">Диагностика и динамика</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Опросники, результаты и история изменений доступны в карточке
                    клиента.
                  </p>
                </article>
              </div>
            </div>
          </section>

          <section className="py-14">
            <div className="mx-auto max-w-4xl px-4 text-center">
              <h2 className="text-balance text-2xl font-semibold sm:text-3xl">
                Начните вести практику системно уже сегодня
              </h2>
              <p className="mt-3 text-muted-foreground">
                Регистрация занимает пару минут. Все ключевые инструменты доступны
                сразу после входа.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button size="lg" asChild>
                  <Link href="/auth/register/psychologist">Создать аккаунт психолога</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/auth/login">Войти</Link>
                </Button>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {authenticatedRole && (
        <HeaderNav
          role={authenticatedRole}
          brand={{ href: "/", label: "Empatix" }}
        />
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
      </main>
    </div>
  );
}

