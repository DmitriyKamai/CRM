import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/components/auth/auth-provider";
import { HeaderNav } from "@/components/layout/header-nav";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Empatix",
  description:
    "CRM для психологов и их клиентов с диагностикой, расписанием и безопасным хранением данных."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tangerine:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="empatix-theme">
          <AuthProvider>
            <header className="border-b bg-background/80 backdrop-blur">
              <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                <div className="text-3xl md:text-4xl font-semibold tracking-tight tangerine-bold">
                  Empatix
                </div>
                <Suspense fallback={<div className="text-xs text-muted-foreground">Загрузка…</div>}>
                  <HeaderNav />
                </Suspense>
              </div>
            </header>
            <main className="mx-auto flex min-h-[calc(100vh-3.25rem)] max-w-6xl flex-col px-4 py-6">
              {children}
            </main>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

