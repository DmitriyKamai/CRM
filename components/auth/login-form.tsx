"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import { OAuthGoogleIcon } from "@/components/auth/oauth-brand-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const urlErrorMessage =
    searchParams.get("error") === "AccountAlreadyLinked"
      ? "Этот Google или Apple аккаунт уже привязан к другому пользователю. Войдите под тем аккаунтом или используйте другой."
      : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(urlErrorMessage);
  const [urlErrorDismissed, setUrlErrorDismissed] = useState(false);
  const displayedError = error ?? (!urlErrorDismissed ? urlErrorMessage : null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUrlErrorDismissed(true);

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl
    });

    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    // Обновить кэш сессии на клиенте, чтобы защищённые страницы увидели пользователя
    router.refresh();
    router.push(callbackUrl);
  }

  async function handleSocial(provider: "google" | "apple") {
    setError(null);
    // Для входа через соцсети ведём на выбор роли.
    await signIn(provider, { callbackUrl: "/auth/choose-role" });
  }

  return (
    <Card className="max-w-md w-full mx-auto">
      <CardHeader>
        <CardTitle className="text-lg">Вход в CRM</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayedError && (
          <div className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
            {displayedError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Входим..." : "Войти"}
          </Button>
        </form>
        <div className="text-sm font-semibold text-muted-foreground">
          <Link
            href="/auth/forgot-password"
            className="text-primary/90 transition-colors hover:text-primary"
          >
            Забыли пароль?
          </Link>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span>или</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleSocial("google")}
          >
            <span className="flex items-center justify-center gap-2">
              <span className="inline-flex h-4 w-4 items-center justify-center">
                <OAuthGoogleIcon />
              </span>
              <span>Войти через Google</span>
            </span>
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground pt-2">
          У вас нет аккаунта?
          <br />
          <Link
            href="/auth/register/client"
            className="text-primary/90 transition-colors hover:text-primary"
          >
            Зарегистрироваться как клиент
          </Link>
          {" / "}
          <Link
            href="/auth/register/psychologist"
            className="text-primary/90 transition-colors hover:text-primary"
          >
            психолог
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

