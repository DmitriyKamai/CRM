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
    await signIn(provider, { callbackUrl });
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
            Войти через Google
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleSocial("apple")}
          >
            Войти через Apple ID
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

