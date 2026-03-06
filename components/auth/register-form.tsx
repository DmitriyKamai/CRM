"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Role = "psychologist" | "client";

interface RegisterFormProps {
  role: Role;
}

export function RegisterForm({ role }: RegisterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const inviteToken =
        role === "client" ? searchParams.get("invite") ?? undefined : undefined;

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          role,
          firstName,
          lastName,
          email,
          password,
          inviteToken
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? "Не удалось зарегистрироваться");
        setLoading(false);
        return;
      }

      router.push("/auth/login");
    } catch (err) {
      console.error(err);
      const isRefused =
        err instanceof TypeError && (err.message === "Failed to fetch" || (err as any).cause?.code === "ECONNREFUSED");
      setError(
        isRefused
          ? "Не удалось подключиться к серверу. Убедитесь, что dev-сервер запущен (npm run dev). Если открываете с другого устройства, используйте адрес вида http://IP-вашего-ПК:3000, а не localhost."
          : "Не удалось подключиться к серверу"
      );
      setLoading(false);
    }
  }

  const title =
    role === "psychologist" ? "Регистрация психолога" : "Регистрация клиента";

  return (
    <Card className="max-w-md w-full mx-auto">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="firstName">Имя</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">Фамилия</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

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
            {loading ? "Создаём аккаунт..." : "Зарегистрироваться"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

