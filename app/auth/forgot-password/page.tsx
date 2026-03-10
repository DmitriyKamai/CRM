"use client";

import { useState } from "react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? "Не удалось отправить ссылку для восстановления");
        return;
      }
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-lg">Восстановление пароля</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
              {error}
            </div>
          )}
          {success ? (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Если пользователь с таким email существует, мы отправили на него ссылку
                для восстановления пароля.
              </p>
              <p>Проверьте почту и перейдите по ссылке из письма.</p>
              <p>
                <Link href="/auth/login" className="text-primary underline-offset-4 hover:underline">
                  Вернуться на страницу входа
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={64}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Отправляем..." : "Отправить ссылку для восстановления"}
              </Button>
              <p className="text-xs text-muted-foreground">
                <Link href="/auth/login" className="text-primary underline-offset-4 hover:underline">
                  Вспомнили пароль? Вернуться ко входу
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

