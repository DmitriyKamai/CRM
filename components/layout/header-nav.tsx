"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { LayoutDashboard, LogOut, Menu, Moon, Settings, Sun } from "lucide-react";

/** Подписи профессии из профессионального профиля (значение → отображаемое название). */
const PROFESSION_LABELS: Record<string, string> = {
  psychologist: "Психолог",
  psychotherapist: "Врач-психотерапевт",
  psychiatrist: "Психиатр"
};

function getProfessionLabel(specialization: string | null | undefined): string {
  if (!specialization?.trim()) return "Специалист";
  return PROFESSION_LABELS[specialization.trim()] ?? "Специалист";
}

import { NotificationsPanel } from "@/components/layout/notifications-panel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function NavLink({
  href,
  label,
  exact
}: {
  href: string;
  label: string;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={cn(
        "text-sm px-2 py-1.5 rounded-md transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
    >
      {label}
    </Link>
  );
}

function SheetNavLink({ href, label, exact }: { href: string; label: string; exact?: boolean }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  return (
    <SheetClose asChild>
      <Link
        href={href}
        className={cn(
          "block rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        {label}
      </Link>
    </SheetClose>
  );
}

function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 shrink-0"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Светлая тема" : "Тёмная тема"}
      aria-label={isDark ? "Светлая тема" : "Тёмная тема"}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-muted-foreground hover:text-foreground" />
      ) : (
        <Moon className="h-4 w-4 text-muted-foreground hover:text-foreground" />
      )}
    </Button>
  );
}

export function HeaderNav() {
  const { data: session, status } = useSession();
  const [professionLabel, setProfessionLabel] = useState<string | null>(null);

  const role = (session?.user as { role?: string } | undefined)?.role as
    | "CLIENT"
    | "PSYCHOLOGIST"
    | "ADMIN"
    | undefined;

  const fetchProfessionLabel = useCallback(() => {
    if (role !== "PSYCHOLOGIST") return;
    fetch("/api/user/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { psychologistProfile?: { specialization?: string | null } } | null) => {
        if (!data?.psychologistProfile) {
          setProfessionLabel("Специалист");
          return;
        }
        setProfessionLabel(
          getProfessionLabel(data.psychologistProfile.specialization ?? null)
        );
      })
      .catch(() => setProfessionLabel("Специалист"));
  }, [role]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user || role !== "PSYCHOLOGIST") {
      return;
    }
    fetchProfessionLabel();
  }, [status, session?.user, role, fetchProfessionLabel]);

  if (status === "loading") {
    return (
      <div className="flex items-center gap-3 text-xs text-slate-400">
        Загрузка...
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <NavLink href="/auth/login" label="Войти" />
        <NavLink href="/auth/register/psychologist" label="Я психолог" />
        <NavLink href="/auth/register/client" label="Я клиент" />
      </div>
    );
  }

  const email = (session.user as { email?: string }).email ?? "";
  const name = session.user?.name ?? email;
  const profileHref =
    role === "PSYCHOLOGIST"
      ? "/psychologist"
      : role === "CLIENT"
        ? "/client"
        : role === "ADMIN"
          ? "/admin"
          : "/";
  const roleLabel =
    role === "PSYCHOLOGIST"
      ? (professionLabel ?? "Специалист")
      : role === "CLIENT"
        ? "Клиент"
        : role === "ADMIN"
          ? "Администратор"
          : "Пользователь";

  const initials = name
    ? name
        .split(/\s+/)
        .map((s: string) => s[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : email
      ? email.slice(0, 2).toUpperCase()
      : "?";

  const mobileNavLinks =
    role === "PSYCHOLOGIST"
      ? [
          { href: "/psychologist", label: "Кабинет", exact: true },
          { href: "/psychologist/schedule", label: "Расписание" },
          { href: "/psychologist/clients", label: "Клиенты" },
          { href: "/psychologist/diagnostics", label: "Диагностика" },
          { href: "/psychologist/settings", label: "Настройки" }
        ]
        : role === "CLIENT"
        ? [
            { href: "/client/psychologists", label: "Запись к психологу" },
            { href: "/client", label: "Кабинет клиента", exact: true },
            { href: "/client/settings", label: "Настройки" }
          ]
        : role === "ADMIN"
          ? [
              { href: "/admin", label: "Админка", exact: true },
              { href: "/admin/users", label: "Пользователи" }
            ]
          : [];

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <ThemeToggle />
      {/* Мобильное меню */}
      {mobileNavLinks.length > 0 && (
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 md:hidden"
              aria-label="Открыть меню"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] sm:w-[300px]">
            <SheetHeader>
              <SheetTitle className="text-left">Меню</SheetTitle>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-1">
              {mobileNavLinks.map(({ href, label, exact }) => (
                <SheetNavLink key={href} href={href} label={label} exact={exact} />
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      )}
      <div className="hidden md:flex items-center gap-2">
        {role === "PSYCHOLOGIST" && (
          <>
            <NavLink href="/psychologist" label="Кабинет" exact />
            <NavLink href="/psychologist/schedule" label="Расписание" />
            <NavLink href="/psychologist/clients" label="Клиенты" />
            <NavLink href="/psychologist/diagnostics" label="Диагностика" />
          </>
        )}
        {role === "CLIENT" && (
          <>
            <NavLink
              href="/client/psychologists"
              label="Запись к психологу"
            />
            <NavLink href="/client" label="Кабинет клиента" exact />
            <NavLink href="/client/settings" label="Настройки" />
          </>
        )}
        {role === "ADMIN" && (
          <>
            <NavLink href="/admin" label="Админка" exact />
            <NavLink href="/admin/users" label="Пользователи" />
          </>
        )}
      </div>

      <NotificationsPanel />
      <DropdownMenu
        onOpenChange={(open) => {
          if (open && role === "PSYCHOLOGIST") fetchProfessionLabel();
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-9 w-9 rounded-full p-0 focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage
                src={session.user?.image ?? undefined}
                alt={name}
              />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-72 w-max max-w-[min(22rem,95vw)] align-end" align="end" forceMount>
          <div className="flex items-center gap-3 p-2">
            <Avatar className="h-14 w-14 shrink-0">
              <AvatarImage
                src={session.user?.image ?? undefined}
                alt={name}
              />
              <AvatarFallback className="bg-muted text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="truncate text-sm font-medium leading-none">{name}</p>
              <p className="break-all text-xs text-muted-foreground">{email}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
          </div>
          <DropdownMenuSeparator />
          {(role === "PSYCHOLOGIST" || role === "CLIENT") && (
            <DropdownMenuItem asChild>
              <Link
                href={role === "PSYCHOLOGIST" ? "/psychologist/settings" : "/client/settings"}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                Настройки профиля
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href={profileHref} className="cursor-pointer">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Перейти в кабинет
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/15 focus:text-destructive"
            onSelect={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Выйти
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

