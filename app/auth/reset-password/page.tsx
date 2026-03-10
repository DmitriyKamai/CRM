"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PasswordChecks = {
  length: boolean;
  letters: boolean;
  digits: boolean;
  special: boolean;
};

function evaluatePassword(password: string): PasswordChecks {
  return {
    length: password.length >= 8,
    letters: /[A-Za-zА-Яа-я]/.test(password),
    digits: /\d/.test(password),
    special: /[^A-Za-zА-Яа-я0-9\s]/.test(password)
  };
}

function getPasswordError(password: string, checks: PasswordChecks): string | null {
  if (password.length === 0) return null;
  if (!checks.length) return "Пароль должен быть не короче 8 символов";
  if (!checks.letters) return "Пароль должен содержать буквы";
  if (!checks.digits) return "Пароль должен содержать цифры";
  if (!checks.special) {
    return "Добавьте специальный символ (например, !, ?, %)";
  }
  return null;
}

function ResetPasswordPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [checks, setChecks] = useState<PasswordChecks>(() => evaluatePassword(""));
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordError = getPasswordError(newPassword, checks);
  const passwordMismatch =
    newPasswordConfirm.length > 0 && newPasswordConfirm !== newPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);

    const currentChecks = evaluatePassword(newPassword);
    const err = getPasswordError(newPassword, currentChecks);
    if (err) {
      setChecks(currentChecks);
      setError(err);
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setError("Пароли не совпадают");
      return;
    }
    if (!token) {
      setError("Ссылка для восстановления недействительна");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data?.message ?? "Не удалось установить новый пароль. Попробуйте позже."
        );
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-lg">Установка нового пароля</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
              {error}
            </div>
          )}
          {success ? (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Новый пароль сохранён. Сейчас мы перенаправим вас на страницу входа.</p>
              <p>
                Если этого не произошло, вы можете{" "}
                <Link
                  href="/auth/login"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  перейти к входу вручную
                </Link>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="new-password">Новый пароль</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewPassword(value);
                    setChecks(evaluatePassword(value));
                  }}
                  onBlur={() => setTouched(true)}
                  className={
                    touched && passwordError
                      ? "border-destructive focus-visible:ring-destructive"
                      : touched && !passwordError
                      ? "border-emerald-500 focus-visible:ring-emerald-500"
                      : undefined
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-password-confirm">Повторите новый пароль</Label>
                <Input
                  id="new-password-confirm"
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  className={
                    touched && (passwordMismatch || passwordError)
                      ? "border-destructive focus-visible:ring-destructive"
                      : touched && !passwordMismatch && !passwordError
                      ? "border-emerald-500 focus-visible:ring-emerald-500"
                      : undefined
                  }
                />
              </div>
              {touched && (passwordError || passwordMismatch) && (
                <p className="text-xs text-destructive">
                  {passwordMismatch ? "Пароли не совпадают" : passwordError}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Сохраняем..." : "Сохранить новый пароль"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center text-sm text-muted-foreground">
          Загрузка...
        </div>
      }
    >
      <ResetPasswordPageInner />
    </Suspense>
  );
}

