"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, CheckCircle2, Circle, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Role = "psychologist" | "client";

interface RegisterFormProps {
  role: Role;
}

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

export function RegisterForm({ role }: RegisterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [passwordChecks, setPasswordChecks] = useState<PasswordChecks>(
    () => evaluatePassword("")
  );
  const [touchedPassword, setTouchedPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSocial(provider: "google" | "apple") {
    setError(null);
    const search = new URLSearchParams();
    search.set("role", role === "psychologist" ? "psychologist" : "client");
    search.set("from", "register");
    const callbackUrl = `/auth/social-complete?${search.toString()}`;
    await signIn(provider, { callbackUrl });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const passwordValid =
      password.length > 0 &&
      Object.values(passwordChecks).every(Boolean);
    const passwordsMatch =
      password.length > 0 &&
      passwordConfirm.length > 0 &&
      password === passwordConfirm;

    if (!passwordValid || !passwordsMatch) {
      setLoading(false);
      return;
    }

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

  const passwordValid =
    password.length > 0 &&
    Object.values(passwordChecks).every(Boolean);
  const passwordsMatch =
    password.length > 0 &&
    passwordConfirm.length > 0 &&
    password === passwordConfirm;
  const canSubmit =
    !loading && passwordValid && passwordsMatch && firstName && lastName && email;

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

          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => {
                  const value = e.target.value;
                  setPassword(value);
                  setPasswordChecks(evaluatePassword(value));
                  if (!touchedPassword) setTouchedPassword(true);
                }}
                required
                autoComplete="new-password"
                className="pr-10"
                minLength={8}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(prev => !prev)}
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="space-y-1 rounded-md border bg-muted/40 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                Пароль должен содержать:
              </p>
              <ul className="space-y-0.5 text-xs">
                <li className="flex items-center gap-2">
                  {passwordChecks.length ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span>Не менее 8 символов</span>
                </li>
                <li className="flex items-center gap-2">
                  {passwordChecks.letters ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span>Буквы (латиница или кириллица)</span>
                </li>
                <li className="flex items-center gap-2">
                  {passwordChecks.digits ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span>Цифры</span>
                </li>
                <li className="flex items-center gap-2">
                  {passwordChecks.special ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span>Специальные символы (например, !, ?, %)</span>
                </li>
              </ul>
              {touchedPassword && !passwordValid && password.length > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>Сделайте пароль сложнее, чтобы защитить аккаунт.</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passwordConfirm">Повторите пароль</Label>
            <div className="relative">
              <Input
                id="passwordConfirm"
                type={showPasswordConfirm ? "text" : "password"}
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
                required
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPasswordConfirm(prev => !prev)}
                aria-label={showPasswordConfirm ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPasswordConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {passwordConfirm.length > 0 && !passwordsMatch && (
              <p className="text-xs text-destructive">
                Пароли не совпадают.
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {loading ? "Создаём аккаунт..." : "Зарегистрироваться"}
          </Button>
        </form>

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
          <span className="h-px flex-1 bg-border" />
          <span>или</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="flex flex-col gap-2 pt-1">
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
                  <g clipPath="url(#gh_google_clip_reg)">
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
                    <clipPath id="gh_google_clip_reg">
                      <rect width="16" height="16" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              </span>
              <span>Зарегистрироваться через Google</span>
            </span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleSocial("apple")}
          >
            <span className="flex items-center justify-center gap-2">
              <span className="inline-flex h-4 w-4 items-center justify-center relative -top-px">
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                  className="block"
                >
                  <g clipPath="url(#gh_apple_clip_reg)">
                    <path
                      d="M8.08803 4.3535C8.74395 4.3535 9.56615 3.91006 10.0558 3.31881C10.4992 2.78299 10.8226 2.03469 10.8226 1.28639C10.8226 1.18477 10.8133 1.08314 10.7948 1C10.065 1.02771 9.18738 1.48963 8.6608 2.10859C8.24508 2.57975 7.86631 3.31881 7.86631 4.07635C7.86631 4.18721 7.88479 4.29807 7.89402 4.33502C7.94021 4.34426 8.01412 4.3535 8.08803 4.3535ZM5.77846 15.5318C6.67457 15.5318 7.07182 14.9313 8.18965 14.9313C9.32596 14.9313 9.57539 15.5133 10.5731 15.5133C11.5524 15.5133 12.2083 14.608 12.8273 13.7211C13.5201 12.7049 13.8065 11.7072 13.825 11.661C13.7603 11.6425 11.885 10.8757 11.885 8.7232C11.885 6.85707 13.3631 6.01639 13.4462 5.95172C12.467 4.5475 10.9796 4.51055 10.5731 4.51055C9.47377 4.51055 8.57766 5.1757 8.01412 5.1757C7.4044 5.1757 6.60066 4.5475 5.64912 4.5475C3.83842 4.5475 2 6.0441 2 8.87101C2 10.6263 2.68363 12.4832 3.52432 13.6842C4.2449 14.7004 4.87311 15.5318 5.77846 15.5318Z"
                      fill="currentColor"
                    />
                  </g>
                  <defs>
                    <clipPath id="gh_apple_clip_reg">
                      <rect width="16" height="16" />
                    </clipPath>
                  </defs>
                </svg>
              </span>
              <span>Зарегистрироваться через Apple ID</span>
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

