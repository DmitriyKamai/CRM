"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { CalendarSubscriptionBlock } from "@/components/schedule/calendar-subscription";

type Profile = {
  user: {
    name: string | null;
    email: string;
    image: string | null;
    dateOfBirth: string | null;
    role: string;
  };
  psychologistProfile: {
    firstName: string;
    lastName: string;
    phone: string | null;
    bio: string | null;
  } | null;
};

type Account = { provider: string; label: string };

function Section({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export function PsychologistSettingsForm() {
  const { data: session, update: updateSession } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (cancelled) return;
        if (p) {
          setProfile(p);
          setFirstName(p.psychologistProfile?.firstName ?? p.user?.name ?? "");
          setLastName(p.psychologistProfile?.lastName ?? "");
          setEmail(p.user?.email ?? "");
          setPhone(p.psychologistProfile?.phone ?? "");
          setDateOfBirth(p.user?.dateOfBirth ?? "");
        }
        return fetch("/api/user/accounts");
      })
      .then((r) => (r?.ok ? r.json() : { accounts: [] }))
      .then((a) => {
        if (!cancelled && a?.accounts) setAccounts(a.accounts);
        if (!cancelled) setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phone: phone.trim() || null,
          ...(email.trim() &&
          email.trim().toLowerCase() !== (profile.user?.email ?? "").trim().toLowerCase()
            ? { email: email.trim() }
            : {}),
          dateOfBirth: dateOfBirth || null
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Не удалось сохранить");
        return;
      }
      toast.success("Сохранено");
      updateSession?.();
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              user: {
                ...prev.user,
                email: email.trim() || prev.user.email,
                dateOfBirth: dateOfBirth || null
              },
              psychologistProfile: prev.psychologistProfile
                ? { ...prev.psychologistProfile, firstName, lastName, phone: phone.trim() || null }
                : { firstName, lastName, phone: phone.trim() || null, bio: null }
            }
          : null
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== newPasswordConfirm) {
      toast.error("Пароли не совпадают");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Пароль не менее 8 символов");
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Не удалось сменить пароль");
        return;
      }
      toast.success("Пароль изменён");
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-8">
        Загрузка настроек…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-sm text-muted-foreground py-8">
        Не удалось загрузить настройки. Проверьте подключение и обновите страницу.
      </div>
    );
  }

  const hasGoogle = accounts.some((a) => a.provider === "google");
  const hasApple = accounts.some((a) => a.provider === "apple");
  const name = session?.user?.name ?? "";
  const displayEmail = (email || profile.user?.email) ?? "";
  const image = session?.user?.image ?? null;
  const initials = [firstName, lastName].filter(Boolean).join(" ") || name || displayEmail.slice(0, 2);

  const savedFirstName = profile.psychologistProfile?.firstName ?? profile.user?.name ?? "";
  const savedLastName = profile.psychologistProfile?.lastName ?? "";
  const savedEmail = profile.user?.email ?? "";
  const savedPhone = profile.psychologistProfile?.phone ?? "";
  const savedDateOfBirth = profile.user?.dateOfBirth ?? "";
  const hasProfileChanges =
    firstName !== savedFirstName ||
    lastName !== savedLastName ||
    (email.trim().toLowerCase()) !== savedEmail.trim().toLowerCase() ||
    (phone.trim() || "") !== (savedPhone || "") ||
    (dateOfBirth || "") !== (savedDateOfBirth || "");

  return (
    <div className="space-y-6">
      {/* Личные данные */}
      <Section title="Личные данные">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={image ?? undefined} alt={name} />
              <AvatarFallback className="bg-muted text-lg">
                {initials.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="text-xs text-muted-foreground">
              Аватар подтягивается из привязанного Google или Apple. Загрузка своего аватара — позже.
            </p>
          </div>
          <div className="space-y-2 max-w-sm">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-2 max-w-sm">
            <Label htmlFor="phone">Телефон</Label>
            <PhoneInput
              id="phone"
              value={phone}
              onChange={(value) => setPhone(value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Имя</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Имя"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Фамилия</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Фамилия"
              />
            </div>
          </div>
          <div className="space-y-2 max-w-xs">
            <Label>Дата рождения</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  type="button"
                  className="w-full justify-start text-left font-normal text-foreground bg-[hsl(var(--input-bg))] data-[empty=true]:text-muted-foreground hover:bg-[hsl(var(--input-bg))]/90"
                  data-empty={!dateOfBirth}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                  {dateOfBirth ? (
                    format(new Date(dateOfBirth), "d MMMM yyyy", { locale: ru })
                  ) : (
                    <span>Выберите дату</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateOfBirth ? new Date(dateOfBirth) : undefined}
                  onSelect={(d) =>
                    setDateOfBirth(d ? format(d, "yyyy-MM-dd") : "")
                  }
                  locale={ru}
                  initialFocus
                  defaultMonth={dateOfBirth ? new Date(dateOfBirth) : new Date()}
                  captionLayout="dropdown"
                  startMonth={new Date(1920, 0)}
                  endMonth={new Date()}
                  reverseYears
                  hideNavigation
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button type="submit" disabled={saving || !hasProfileChanges}>
            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
        </form>

        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-medium mb-2">Смена пароля</h4>
          <form onSubmit={handleChangePassword} className="space-y-3 max-w-sm">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Текущий пароль</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Новый пароль</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPasswordConfirm">Повторите новый пароль</Label>
              <Input
                id="newPasswordConfirm"
                type="password"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" variant="secondary" disabled={passwordSaving}>
              {passwordSaving ? "Сохранение…" : "Сменить пароль"}
            </Button>
          </form>
        </div>
      </Section>

      {/* Аккаунты */}
      <Section title="Привязка аккаунтов">
        <p className="text-sm text-muted-foreground">
          Привяжите Google или Apple, чтобы входить без пароля и использовать аватар из профиля.
        </p>
        <div className="flex flex-wrap gap-2">
          {hasGoogle ? (
            <span className="inline-flex items-center rounded-md bg-muted px-3 py-1.5 text-xs font-medium">
              Google привязан
            </span>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => signIn("google", { callbackUrl: "/psychologist/settings" })}
            >
              Привязать Google
            </Button>
          )}
          {hasApple ? (
            <span className="inline-flex items-center rounded-md bg-muted px-3 py-1.5 text-xs font-medium">
              Apple привязан
            </span>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => signIn("apple", { callbackUrl: "/psychologist/settings" })}
            >
              Привязать Apple
            </Button>
          )}
        </div>
      </Section>

      {/* Подписка на календарь */}
      <Section title="Подписка на календарь">
        <CalendarSubscriptionBlock />
      </Section>

      {/* Профессиональный профиль */}
      <Section title="Профессиональный профиль">
        <p className="text-sm text-muted-foreground">
          Раздел «О себе» и другие поля профессионального профиля появятся здесь позже.
        </p>
      </Section>
    </div>
  );
}
