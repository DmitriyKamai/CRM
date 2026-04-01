"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import { Menu, Moon, Settings, Sun, LogOut, LayoutDashboard } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { NotificationsPanel } from "@/components/layout/notifications-panel";

const PROFESSION_LABELS: Record<string, string> = {
  psychologist: "Психолог",
  psychotherapist: "Врач-психотерапевт",
  psychiatrist: "Психиатр"
};

function getProfessionLabel(specialization: string | null | undefined): string {
  if (!specialization?.trim()) return "Специалист";
  return PROFESSION_LABELS[specialization.trim()] ?? "Специалист";
}

function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    void (async () => setMounted(true))();
  }, []);

  // Чтобы не получить hydration mismatch: `resolvedTheme` может отличаться
  // между SSR и первым CSR-рендером (system theme/localStorage).
  // До mount показываем детерминированный плейсхолдер.
  const isDark = mounted ? resolvedTheme === "dark" : true;
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Светлая тема" : "Тёмная тема"}
      aria-label={isDark ? "Светлая тема" : "Тёмная тема"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

const SETTINGS_HREF: Record<string, string> = {
  PSYCHOLOGIST: "/settings",
  CLIENT: "/settings",
  ADMIN: "/admin",
};

const PROFILE_HREF: Record<string, string> = {
  PSYCHOLOGIST: "/psychologist",
  CLIENT: "/client",
  ADMIN: "/admin",
};

type HeaderNavProps = {
  role: "PSYCHOLOGIST" | "CLIENT" | "ADMIN";
  onMenuClick?: () => void;
  /**
   * Опциональный бренд слева в шапке (нужно, например, для главной страницы).
   * На остальных страницах обычно используется только меню/иконки.
   */
  brand?: { href: string; label: string };
};

export function HeaderNav({ role, onMenuClick, brand }: HeaderNavProps) {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    void (async () => setMounted(true))();
  }, []);

  const { data: profileData } = useQuery({
    queryKey: ["user-profile-nav"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile");
      if (!res.ok) return null;
      return res.json() as Promise<{
        psychologistProfile?: { specialization?: string | null };
      } | null>;
    },
    enabled: role === "PSYCHOLOGIST",
    staleTime: 5 * 60 * 1000
  });

  const user = session?.user;
  const name =
    mounted
      ? user?.name ?? (user as { email?: string } | undefined)?.email ?? ""
      : "";
  const email = mounted ? (user as { email?: string } | undefined)?.email ?? "" : "";
  const initials = mounted
    ? name
      ? name.split(/\s+/).map((s: string) => s[0]).join("").toUpperCase().slice(0, 2)
      : email
        ? email.slice(0, 2).toUpperCase()
        : "?"
    : "?";

  const settingsHref = SETTINGS_HREF[role] ?? "/";
  const profileHref = PROFILE_HREF[role] ?? "/";

  const professionLabel =
    role === "PSYCHOLOGIST"
      ? getProfessionLabel(profileData?.psychologistProfile?.specialization ?? null)
      : null;

  const roleLabel =
    role === "PSYCHOLOGIST"
      ? mounted ? professionLabel ?? "Специалист" : "—"
      : role === "CLIENT"
        ? mounted ? "Клиент" : "—"
        : role === "ADMIN"
          ? mounted ? "Администратор" : "—"
          : mounted ? "Пользователь" : "—";

  return (
    <header className="relative z-40 flex min-w-0 h-14 shrink-0 items-center justify-between gap-2 rounded-none border-x-0 border-t-0 border-b border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-bg))] px-4">
      <div className="flex min-w-0 items-center gap-2">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 lg:hidden"
            aria-label="Открыть меню"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        {brand && (
          <Link
            href={brand.href}
            className="tangerine-bold text-2xl sm:text-3xl text-foreground leading-none whitespace-nowrap hover:opacity-90"
          >
            {brand.label}
          </Link>
        )}
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <div className="mr-1 sm:mr-2">
          <NotificationsPanel />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-9 w-9 rounded-full p-0 focus-visible:ring-2 focus-visible:ring-offset-2"
              aria-label="Меню пользователя"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={mounted ? user?.image ?? undefined : undefined}
                  alt={mounted ? name : ""}
                />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-72 w-max max-w-[min(22rem,95vw)]"
            forceMount
          >
            <div className="flex items-center gap-3 p-2">
              <Avatar className="h-14 w-14 shrink-0">
                <AvatarImage
                  src={mounted ? user?.image ?? undefined : undefined}
                  alt={mounted ? name : ""}
                />
                <AvatarFallback className="bg-muted text-sm font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="truncate text-sm font-medium leading-none">
                  {mounted ? name : "—"}
                </p>
                <p className="break-all text-xs text-muted-foreground">
                  {mounted ? email : ""}
                </p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={settingsHref} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Настройки профиля
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={profileHref} className="cursor-pointer">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Перейти в кабинет
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-muted-foreground focus:bg-destructive/10 focus:text-destructive"
              onSelect={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Выйти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
