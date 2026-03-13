"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
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
  const isDark = resolvedTheme === "dark";
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
  PSYCHOLOGIST: "/psychologist/settings",
  CLIENT: "/client/settings",
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
};

export function HeaderNav({ role, onMenuClick }: HeaderNavProps) {
  const { data: session } = useSession();
  const [professionLabel, setProfessionLabel] = useState<string | null>(null);

  const user = session?.user;
  const name = user?.name ?? (user as { email?: string } | undefined)?.email ?? "";
  const email = (user as { email?: string } | undefined)?.email ?? "";
  const initials = name
    ? name.split(/\s+/).map((s: string) => s[0]).join("").toUpperCase().slice(0, 2)
    : email
      ? email.slice(0, 2).toUpperCase()
      : "?";

  const settingsHref = SETTINGS_HREF[role] ?? "/";
  const profileHref = PROFILE_HREF[role] ?? "/";

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
    if (role === "PSYCHOLOGIST") fetchProfessionLabel();
  }, [role, fetchProfessionLabel]);

  const roleLabel =
    role === "PSYCHOLOGIST"
      ? (professionLabel ?? "Специалист")
      : role === "CLIENT"
        ? "Клиент"
        : role === "ADMIN"
          ? "Администратор"
          : "Пользователь";

  return (
    <header className="relative z-40 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-bg))] px-4">
      <div className="flex items-center gap-2 min-w-0">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 md:hidden"
            aria-label="Открыть меню"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <ThemeToggle />
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
              aria-label="Меню пользователя"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.image ?? undefined} alt={name} />
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
                <AvatarImage src={user?.image ?? undefined} alt={name} />
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
