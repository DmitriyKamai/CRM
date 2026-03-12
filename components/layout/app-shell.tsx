"use client";

import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { HeaderNav } from "@/components/layout/header-nav";
import { SidebarNav, SidebarNavContent } from "@/components/layout/sidebar-nav";

type AppShellProps = {
  role: "PSYCHOLOGIST" | "CLIENT" | "ADMIN";
  children: React.ReactNode;
};

export function AppShell({ role, children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <HeaderNav role={role} onMenuClick={() => setMobileMenuOpen(true)} />

      <div className="flex flex-1 min-h-0">
        <div className="hidden md:flex h-full shrink-0">
          <SidebarNav role={role} />
        </div>
        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="w-[280px] p-0 border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-bg))]"
        >
          <div className="flex h-full flex-col pt-2">
            <SidebarNavContent role={role} onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
