"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Check, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Role = "psychologist" | "client";

interface RegisterFormProps {
  role: Role;
  /** Встроенный режим: без карточки, для использования в signup-02 layout */
  embedded?: boolean;
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

export function RegisterForm({ role, embedded }: RegisterFormProps) {
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
      const safeFirstName = firstName.trim();
      const safeLastName = lastName.trim();
      const safeEmail = email.trim();
      const inviteToken =
        role === "client" ? searchParams.get("invite") ?? undefined : undefined;

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          role,
          firstName: safeFirstName,
          lastName: safeLastName,
          email: safeEmail,
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

      const callbackUrl = role === "psychologist" ? "/psychologist" : "/client";
      const signInResult = await signIn("credentials", {
        redirect: false,
        email: safeEmail,
        password,
        callbackUrl
      });

      if (signInResult?.error) {
        // Если автологин не удался, просто отправляем на страницу входа.
        router.push("/auth/login");
        return;
      }

      router.push(signInResult?.url ?? callbackUrl);
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

  const passwordError = touchedPassword
    ? getPasswordError(password, passwordChecks)
    : null;
  const passwordValid = !!password && !passwordError;
  const passwordsMatch =
    password.length > 0 &&
    passwordConfirm.length > 0 &&
    password === passwordConfirm;
  const canSubmit =
    !loading && passwordValid && passwordsMatch && firstName && lastName && email;

  const passwordRequirements = [
    { key: "length" as const, text: "Не менее 8 символов" },
    { key: "letters" as const, text: "Буквы (A–Z, а–я)" },
    { key: "digits" as const, text: "Цифры" },
    { key: "special" as const, text: "Спецсимволы (!, ?, % и т.п.)" }
  ];

  const filledCount = (() => {
    let c = 0;
    for (const req of passwordRequirements) {
      if ((passwordChecks as any)[req.key]) c++;
      else break; // строгая последовательность: следующий сегмент не заполняем, пока предыдущий не выполнен
    }
    return c;
  })();

  const progressStage = !password
    ? -1
    : filledCount <= 0
      ? 0
      : filledCount === 1
        ? 1
        : filledCount === 2
          ? 2
          : 3;

  const progressTrackColor =
    progressStage === -1
      ? "bg-muted"
      : progressStage === 0
        ? "bg-destructive/20"
        : progressStage === 1
          ? "bg-amber-500/20"
          : progressStage === 2
            ? "bg-yellow-500/20"
            : "bg-emerald-500/20";

  const progressFillColor =
    progressStage === 0
      ? "bg-destructive/60"
      : progressStage === 1
        ? "bg-amber-500"
        : progressStage === 2
          ? "bg-yellow-500"
          : "bg-emerald-500";

  const formContent = (
    <>
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
                minLength={2}
                maxLength={32}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">Фамилия</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                required
                minLength={2}
                maxLength={32}
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
              maxLength={64}
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
                className={`pr-10 ${
                  passwordValid && passwordsMatch
                    ? "border-emerald-500 focus-visible:ring-emerald-500"
                    : ""
                }`}
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
            {/* Индикация силы и требований к паролю */}
            <div className="space-y-1">
              <div className={`h-1 w-full overflow-hidden rounded-full ${progressTrackColor}`}>
                <div
                  className={`h-full rounded-full ${progressFillColor}`}
                  style={{ width: `${(filledCount / 4) * 100}%` }}
                />
              </div>
              <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[13px] text-muted-foreground">
                {passwordRequirements.map((req, index) => {
                  const sequentialOk = index < filledCount;
                  return (
                    <li key={req.key} className="flex items-center gap-1">
                      <Check
                        className={`h-3 w-3 ${
                          sequentialOk
                            ? "text-emerald-500"
                            : "text-muted-foreground/60"
                        }`}
                      />
                      <span className={sequentialOk ? "text-foreground" : undefined}>
                        {req.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
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
                className={`pr-10 ${
                  passwordConfirm.length > 0 && !passwordsMatch
                    ? "border-destructive focus-visible:ring-destructive"
                    : passwordsMatch && passwordValid
                    ? "border-emerald-500 focus-visible:ring-emerald-500"
                    : ""
                }`}
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
        </div>

        <p className="text-center text-sm text-muted-foreground pt-2">
          Уже есть аккаунт?{" "}
          <Link
            href="/auth/login"
            className="text-primary underline-offset-4 hover:underline"
          >
            Войти
          </Link>
        </p>
    </>
  );

  if (embedded) {
    return formContent;
  }

  return (
    <Card className="max-w-md w-full mx-auto">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {formContent}
      </CardContent>
    </Card>
  );
}

