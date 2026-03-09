"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
        {error && (
          <div className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
            {error}
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
                {/* Логотип Google в виде минимального SVG, как на большинстве сайтов */}
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
                  <path
                    fill="#EA4335"
                    d="M12 10.2v3.6h5.1C16.7 16.7 14.7 18 12 18c-3.3 0-6-2.7-6-6s2.7-6 6-6c1.6 0 3 .6 4.1 1.6l2.5-2.5C16.9 3.3 14.6 2.4 12 2.4 6.9 2.4 2.7 6.6 2.7 11.7S6.9 21 12 21c5 0 8.7-3.5 8.7-8.4 0-.6-.1-1.1-.2-1.6H12z"
                  />
                </svg>
              </span>
              <span>Войти через Google</span>
            </span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleSocial("apple")}
          >
            <span className="flex items-center justify-center gap-2">
              <span className="inline-flex h-4 w-4 items-center justify-center">
                {/* Логотип Apple в виде минимального SVG */}
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-foreground">
                  <path d="M16.7 2.4c0 1-.4 1.9-1 2.6-.7.8-1.9 1.4-2.9 1.3-.1-1 .4-2 .9-2.6.7-.8 1.9-1.4 3-1.5.1.1.1.1 0 .2zm2.3 6.5c-.1.1-1.6.9-1.6 2.6 0 2.1 2 2.8 2 2.8 0 .1-.3 1-1 2-.6.9-1.3 1.8-2.3 1.8-.9 0-1.2-.6-2.4-.6s-1.6.6-2.5.6c-1 .1-1.9-1-2.5-1.9-1.4-1.9-2.5-5.3-1-7.6.7-1.1 1.9-1.8 3.1-1.8 1.2 0 2 .6 3 0 .2-.1 1.4-.8 2.6-.7.4.1 1.6.1 2.6 1.2z" />
                </svg>
              </span>
              <span>Войти через Apple ID</span>
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

