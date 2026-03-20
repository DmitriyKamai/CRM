"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  BarChart2,
  History,
  Settings,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
};

const PSYCHOLOGIST_NAV: NavItem[] = [
  { href: "/psychologist", label: "Кабинет", icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
  { href: "/psychologist/schedule", label: "Расписание", icon: <CalendarDays className="h-4 w-4" /> },
  { href: "/psychologist/clients", label: "Клиенты", icon: <Users className="h-4 w-4" /> },
  { href: "/psychologist/diagnostics", label: "Диагностика", icon: <BarChart2 className="h-4 w-4" /> },
];

const CLIENT_NAV: NavItem[] = [
  { href: "/client", label: "Кабинет", icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
  { href: "/client/psychologists", label: "Найти психолога", icon: <Users className="h-4 w-4" /> },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Обзор", icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
  { href: "/admin/users", label: "Пользователи", icon: <Users className="h-4 w-4" /> },
  { href: "/admin/diagnostics", label: "Тесты", icon: <BarChart2 className="h-4 w-4" /> },
  { href: "/admin/audit-log", label: "Аудит действий пользователей", icon: <History className="h-4 w-4" /> }
];

const SETTINGS_HREF: Record<string, string> = {
  PSYCHOLOGIST: "/psychologist/settings",
  CLIENT: "/client/settings",
  ADMIN: "/admin",
};

type SidebarNavContentProps = {
  role: "PSYCHOLOGIST" | "CLIENT" | "ADMIN";
  onNavigate?: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (v: boolean) => void;
};

export function SidebarNavContent({
  role,
  onNavigate,
  collapsed = false,
  onCollapsedChange
}: SidebarNavContentProps) {
  const pathname = usePathname();

  const navItems =
    role === "PSYCHOLOGIST" ? PSYCHOLOGIST_NAV :
    role === "CLIENT" ? CLIENT_NAV :
    ADMIN_NAV;

  const settingsHref = SETTINGS_HREF[role] ?? "/";

  const linkProps = onNavigate ? { onClick: onNavigate } : {};

  return (
    <>
      <div
        className={cn(
          "flex items-center border-b border-[hsl(var(--sidebar-border))] shrink-0",
          collapsed ? "h-14 justify-center px-0" : "h-14 px-5"
        )}
      >
        {collapsed ? (
          <span className="tangerine-bold text-3xl leading-none text-foreground">E</span>
        ) : (
          <Link href="/" className="tangerine-bold text-4xl leading-none text-foreground" {...linkProps}>
            Empatix
          </Link>
        )}
      </div>

      <nav className="flex-1 flex flex-col gap-0.5 px-2 py-3 overflow-y-auto min-h-0">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md py-2 text-sm transition-colors min-w-0",
                collapsed ? "justify-center px-0" : "px-3",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              {...linkProps}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 pb-2 shrink-0">
        <Link
          href={settingsHref}
          title={collapsed ? "Настройки" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-md py-2 text-sm transition-colors",
            collapsed ? "justify-center px-0" : "px-3",
            pathname.startsWith(settingsHref)
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          {...linkProps}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">Настройки</span>}
        </Link>
      </div>

      <div className="border-t border-[hsl(var(--sidebar-border))] shrink-0" />

      {onCollapsedChange && (
        <div
          className={cn(
            "flex items-center border-t border-[hsl(var(--sidebar-border))] px-2 py-2 shrink-0",
            collapsed ? "flex-col gap-1" : "gap-1"
          )}
        >
          <div className={cn("ml-auto", collapsed && "ml-0")}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              title={collapsed ? "Развернуть" : "Свернуть"}
              onClick={() => onCollapsedChange(!collapsed)}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

export function SidebarNav({ role }: { role: "PSYCHOLOGIST" | "CLIENT" | "ADMIN" }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r transition-[width] duration-200 ease-in-out shrink-0",
        "bg-[hsl(var(--sidebar-bg))] border-[hsl(var(--sidebar-border))]",
        "h-full sticky top-0 overflow-hidden",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      <SidebarNavContent
        role={role}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
      />
    </aside>
  );
}
