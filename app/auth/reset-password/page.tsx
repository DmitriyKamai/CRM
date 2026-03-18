"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, Eye, EyeOff, X } from "lucide-react";

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

  const passwordRequirements = [
    { key: "length" as const, text: "Не менее 8 символов" },
    { key: "letters" as const, text: "Буквы (A–Z, а–я)" },
    { key: "digits" as const, text: "Цифры" },
    { key: "special" as const, text: "Спецсимволы (!, ?, % и т.п.)" }
  ];

  const filledCount = (() => {
    let c = 0;
    for (const req of passwordRequirements) {
      if ((checks as any)[req.key]) c++;
      else break; // строгая последовательность
    }
    return c;
  })();

  const segmentColors = [
    "bg-destructive/60",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-emerald-500"
  ] as const;

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
              <div className="space-y-2">
                <Label htmlFor="new-password">Новый пароль</Label>
                <div className="relative">
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
                  <div className="flex gap-1">
                    {passwordRequirements.map((req, index) => {
                      const filled = !newPassword ? false : index < filledCount;
                      return (
                        // eslint-disable-next-line react/no-array-index-key
                        <div
                          key={req.key}
                          className={`h-1 flex-1 rounded-full ${
                            filled
                              ? segmentColors[index] ?? "bg-emerald-500"
                              : !newPassword
                              ? "bg-muted"
                              : "bg-muted-foreground/30"
                          }`}
                        />
                      );
                    })}
                  </div>
                  <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[13px] text-muted-foreground">
                    {passwordRequirements.map((req, index) => {
                      const sequentialOk = index < filledCount;
                      return (
                        <li key={req.key} className="flex items-center gap-1">
                          {sequentialOk ? (
                            <Check
                              className={`h-3 w-3 ${
                                index === 0
                                  ? "text-destructive"
                                  : index === 1
                                  ? "text-amber-500"
                                  : index === 2
                                  ? "text-yellow-500"
                                  : "text-emerald-500"
                              }`}
                            />
                          ) : (
                            <X className="h-3 w-3 text-muted-foreground/60" />
                          )}
                          <span>{req.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
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

