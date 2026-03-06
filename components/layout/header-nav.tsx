"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";

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
import { cn } from "@/lib/utils";

function NavLink({
  href,
  label
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={cn(
        "text-xs px-2 py-1 rounded-md transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
    >
      {label}
    </Link>
  );
}

export function HeaderNav() {
  const { data: session, status } = useSession();

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
        <NavLink href="/auth/login" label="Войти" />
        <NavLink href="/auth/register/psychologist" label="Я психолог" />
        <NavLink href="/auth/register/client" label="Я клиент" />
      </div>
    );
  }

  const role = (session.user as any).role as
    | "CLIENT"
    | "PSYCHOLOGIST"
    | "ADMIN"
    | undefined;

  const email = (session.user as any).email ?? "";
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
      ? "Психолог"
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

  return (
    <div className="flex items-center gap-3">
      <div className="hidden md:flex items-center gap-2">
        {role === "PSYCHOLOGIST" && (
          <>
            <NavLink href="/psychologist" label="Кабинет" />
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
            <NavLink href="/client" label="Кабинет клиента" />
          </>
        )}
        {role === "ADMIN" && (
          <>
            <NavLink href="/admin" label="Админка" />
            <NavLink href="/admin/users" label="Пользователи" />
          </>
        )}
      </div>

      <NotificationsPanel />
      <DropdownMenu>
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
        <DropdownMenuContent className="w-56 align-end" align="end" forceMount>
          <div className="flex items-center gap-2 p-2">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={session.user?.image ?? undefined}
                alt={name}
              />
              <AvatarFallback className="bg-muted text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium leading-none">{name}</p>
              <p className="text-xs text-muted-foreground">{email}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={profileHref} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
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

