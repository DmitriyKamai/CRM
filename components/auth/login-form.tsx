"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "AccountAlreadyLinked") {
      setError("Этот Google или Apple аккаунт уже привязан к другому пользователю. Войдите под тем аккаунтом или используйте другой.");
    }
  }, [searchParams]);

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
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                  className="block"
                >
                  <g clipPath="url(#gh_google_clip)">
                    <path
                      d="M8.00018 3.16667C9.18018 3.16667 10.2368 3.57333 11.0702 4.36667L13.3535 2.08333C11.9668 0.793333 10.1568 0 8.00018 0C4.87352 0 2.17018 1.79333 0.853516 4.40667L3.51352 6.47C4.14352 4.57333 5.91352 3.16667 8.00018 3.16667Z"
                      fill="#EA4335"
                    />
                    <path
                      d="M15.66 8.18335C15.66 7.66002 15.61 7.15335 15.5333 6.66669H8V9.67335H12.3133C12.12 10.66 11.56 11.5 10.72 12.0667L13.2967 14.0667C14.8 12.6734 15.66 10.6134 15.66 8.18335Z"
                      fill="#4285F4"
                    />
                    <path
                      d="M3.51 9.53001C3.35 9.04668 3.25667 8.53334 3.25667 8.00001C3.25667 7.46668 3.34667 6.95334 3.51 6.47001L0.85 4.40668C0.306667 5.48668 0 6.70668 0 8.00001C0 9.29334 0.306667 10.5133 0.853333 11.5933L3.51 9.53001Z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M8.0001 16C10.1601 16 11.9768 15.29 13.2968 14.0633L10.7201 12.0633C10.0034 12.5467 9.0801 12.83 8.0001 12.83C5.91343 12.83 4.14343 11.4233 3.5101 9.52667L0.850098 11.59C2.1701 14.2067 4.87343 16 8.0001 16Z"
                      fill="#34A853"
                    />
                  </g>
                  <defs>
                    <clipPath id="gh_google_clip">
                      <rect width="16" height="16" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              </span>
              <span>Войти через Google</span>
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

