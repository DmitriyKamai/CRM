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
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10">
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
          className="relative hidden h-[280px] overflow-hidden rounded-xl bg-muted lg:block lg:min-h-[320px] lg:rounded-2xl"
          aria-hidden
        >
          <div
            className="absolute inset-0 bg-[linear-gradient(to_bottom_right,hsl(var(--muted)),hsl(var(--muted-foreground)/0.05))]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          />
        </div>
      </div>
    </div>
  );
}
