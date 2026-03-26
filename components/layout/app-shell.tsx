"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { HeaderNav } from "@/components/layout/header-nav";
import { SidebarNav, SidebarNavContent } from "@/components/layout/sidebar-nav";
import type { PlatformModuleFlags } from "@/lib/platform-modules";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { openMobileMenu, closeMobileMenu } from "@/store/slices/ui.slice";

type AppShellProps = {
  role: "PSYCHOLOGIST" | "CLIENT" | "ADMIN";
  children: React.ReactNode;
  /** Если не передано — считаем все модули включёнными (SSR/старые вызовы). */
  modules?: PlatformModuleFlags;
};

export function AppShell({ role, children, modules }: AppShellProps) {
  const dispatch = useAppDispatch();
  const mobileMenuOpen = useAppSelector(state => state.ui.mobileMenuOpen);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* До lg контент ~768–1023px слишком узкий рядом с фикс. сайдбаром 280px — переполнение тулбаров. Dok — только Sheet. */}
      <div className="hidden h-full shrink-0 lg:flex">
        <SidebarNav role={role} modules={modules} />
      </div>
      <div className="flex flex-1 flex-col min-w-0 min-h-0">
        <HeaderNav
          role={role}
          onMenuClick={() => dispatch(openMobileMenu())}
        />
        <main className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </main>
      </div>

      <Sheet open={mobileMenuOpen} onOpenChange={open => dispatch(open ? openMobileMenu() : closeMobileMenu())}>
        <SheetContent
          side="left"
          className="surface-glass w-[280px] rounded-none border-l-0 border-t-0 border-b-0 border-r border-r-[hsl(var(--sidebar-border))] p-0"
        >
          <div className="flex h-full flex-col pt-2">
            <SidebarNavContent
              role={role}
              modules={modules}
              onNavigate={() => dispatch(closeMobileMenu())}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
