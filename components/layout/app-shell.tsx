"use client";

import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { HeaderNav } from "@/components/layout/header-nav";
import { SidebarNav, SidebarNavContent } from "@/components/layout/sidebar-nav";
import type { PlatformModuleFlags } from "@/lib/platform-modules";

type AppShellProps = {
  role: "PSYCHOLOGIST" | "CLIENT" | "ADMIN";
  children: React.ReactNode;
  /** Если не передано — считаем все модули включёнными (SSR/старые вызовы). */
  modules?: PlatformModuleFlags;
};

export function AppShell({ role, children, modules }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Сайдбар от верха до низа экрана (слева) */}
      <div className="hidden md:flex h-full shrink-0">
        <SidebarNav role={role} modules={modules} />
      </div>
      {/* Хедер и контент справа от сайдбара */}
      <div className="flex flex-1 flex-col min-w-0 min-h-0">
        <HeaderNav role={role} onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </main>
      </div>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="surface-glass w-[280px] rounded-none border-l-0 border-t-0 border-b-0 border-r border-r-[hsl(var(--sidebar-border))] p-0 shadow-2xl"
        >
          <div className="flex h-full flex-col pt-2">
            <SidebarNavContent
              role={role}
              modules={modules}
              onNavigate={() => setMobileMenuOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
