"use client";

import Link from "next/link";
import { GalleryVerticalEnd } from "lucide-react";

type Role = "client" | "psychologist";

interface SignupPageLayoutProps {
  role: Role;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function SignupPageLayout({
  role,
  title,
  description,
  children
}: SignupPageLayoutProps) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10" data-role={role}>
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 lg:items-start">
        <div className="flex flex-col gap-6">
          <div className="flex justify-center gap-2 lg:justify-start">
            <Link
              href="/"
              className="flex items-center gap-2 font-medium text-foreground"
            >
              <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <GalleryVerticalEnd className="size-4" />
              </div>
              Empatix
            </Link>
          </div>
          <div className="w-full max-w-sm mx-auto lg:mx-0 space-y-6">
            <div className="space-y-1 text-center lg:text-left">
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              {description && (
                <p className="text-sm text-muted-foreground text-balance">
                  {description}
                </p>
              )}
            </div>
            {children}
            <p className="text-center text-sm text-muted-foreground lg:text-left">
              Уже есть аккаунт?{" "}
              <Link
                href="/auth/login"
                className="text-primary font-medium underline-offset-4 hover:underline"
              >
                Войти
              </Link>
            </p>
          </div>
        </div>
        <div
          className="bg-placeholder-surface hidden h-[280px] rounded-xl border border-border/50 lg:block lg:min-h-[320px] lg:rounded-2xl"
          aria-hidden
        />
      </div>
    </div>
  );
}
