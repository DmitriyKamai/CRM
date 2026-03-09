"use client";

import React, { Component, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { signIn, signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar as CalendarIcon, User, Lock, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((m) => ({ default: m.Calendar })),
  { ssr: false }
);
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PhoneInput } from "@/components/ui/phone-input";
import { CountryAutocomplete, CityAutocomplete } from "@/components/ui/location-autocomplete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCountryCodeByName } from "@/lib/data/countries-ru";
import { TelegramAccountBlock } from "@/components/account/telegram-account-block";

const MARITAL_OPTIONS: { value: string; label: string }[] = [
  { value: "single", label: "Не в браке" },
  { value: "married", label: "В браке" },
  { value: "divorced", label: "В разводе" },
  { value: "widowed", label: "Вдовец / Вдова" },
  { value: "unspecified", label: "Не указано" }
];

type Profile = {
  user: {
    name: string | null;
    email: string;
    image: string | null;
    dateOfBirth: string | null;
    role: string;
    phone?: string | null;
    country?: string | null;
    city?: string | null;
    gender?: string | null;
    maritalStatus?: string | null;
  };
};

type Account = { provider: string; label: string };

class SettingsFormErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, message: (error as Error)?.message ?? String(error) };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("[ClientSettingsForm] render error:", error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-md border border-destructive/60 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Ошибка при отображении формы настроек. Обновите страницу. ({this.state.message})
        </div>
      );
    }
    return this.props.children;
  }
}

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

export function ClientSettingsForm() {
  const { data: session, update: updateSession } = useSession();
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [gender, setGender] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user/profile")
      .then((r) => {
        if (r.status === 401) {
          signOut({ callbackUrl: "/auth/login" });
          return Promise.reject(new Error("unauthorized"));
        }
        return r.ok ? r.json() : null;
      })
      .then((p) => {
        if (cancelled) return undefined;
        if (p) {
          setProfile(p);
          const nameParts = (p.user?.name ?? "").trim().split(/\s+/).filter(Boolean);
          setFirstName(nameParts[0] ?? "");
          setLastName(nameParts.slice(1).join(" ") ?? "");
          setEmail(p.user?.email ?? "");
          setDateOfBirth(p.user?.dateOfBirth ?? "");
          setPhone(p.user?.phone ?? "");
          setCountry(p.user?.country ?? "");
          setCity(p.user?.city ?? "");
          setCountryCode(p.user?.country ? getCountryCodeByName(p.user.country) : null);
          setGender(p.user?.gender ?? "");
          setMaritalStatus(p.user?.maritalStatus ?? "");
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
          name: [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim() || null,
          ...(email.trim() &&
          email.trim().toLowerCase() !== (profile.user?.email ?? "").trim().toLowerCase()
            ? { email: email.trim() }
            : {}),
          dateOfBirth: dateOfBirth || null,
          phone: phone.trim() || null,
          country: country.trim() || null,
          city: city.trim() || null,
          gender: gender || null,
          maritalStatus: maritalStatus || null
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
                name: [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim() || prev.user.name,
                email: email.trim() || prev.user.email,
                dateOfBirth: dateOfBirth || null,
                phone: phone.trim() || null,
                country: country.trim() || null,
                city: city.trim() || null,
                gender: gender || null,
                maritalStatus: maritalStatus || null
              }
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

  if (!profile?.user) {
    return (
      <div className="text-sm text-muted-foreground py-8">
        Не удалось загрузить настройки. Обновите страницу.
      </div>
    );
  }

  const hasGoogle = accounts.some((a) => a.provider === "google");
  const hasApple = accounts.some((a) => a.provider === "apple");
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const displayName = session?.user?.name ?? fullName ?? "";
  const displayEmail = (email || profile.user?.email) ?? "";
  const image = session?.user?.image ?? profile.user?.image ?? null;
  const initials =
    (fullName || displayName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((s) => s[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || displayEmail.slice(0, 2).toUpperCase() || "?";

  const savedName = (profile.user?.name ?? "").trim();
  const hasProfileChanges =
    fullName !== savedName ||
    (email.trim().toLowerCase()) !== (profile.user?.email ?? "").trim().toLowerCase() ||
    (dateOfBirth || "") !== (profile.user?.dateOfBirth ?? "") ||
    (phone.trim() || "") !== (profile.user?.phone ?? "").trim() ||
    (country.trim() || "") !== (profile.user?.country ?? "").trim() ||
    (city.trim() || "") !== (profile.user?.city ?? "").trim() ||
    (gender || "") !== (profile.user?.gender ?? "") ||
    (maritalStatus || "") !== (profile.user?.maritalStatus ?? "");

  return (
    <SettingsFormErrorBoundary>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v ?? "profile")} className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1 bg-muted/80">
          <TabsTrigger value="profile" className="flex items-center gap-2 shrink-0">
            <User className="h-4 w-4" />
            Личные данные
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 shrink-0">
            <Lock className="h-4 w-4" />
            Безопасность
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center gap-2 shrink-0">
            <Link2 className="h-4 w-4" />
            Аккаунты
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          {activeTab === "profile" && (
            <Section title="Личные данные">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={image ?? undefined} alt={displayName} />
                    <AvatarFallback className="bg-muted text-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-xs text-muted-foreground">
                    Аватар подтягивается из привязанного Google или Apple. Загрузка своего аватара — позже.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 max-w-sm">
                  <div className="space-y-2">
                    <Label htmlFor="client-firstName">Имя</Label>
                    <Input
                      id="client-firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Имя"
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-lastName">Фамилия</Label>
                    <Input
                      id="client-lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Фамилия"
                      autoComplete="family-name"
                    />
                  </div>
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
                <div className="space-y-2 max-w-sm">
                  <Label htmlFor="client-settings-phone">Телефон</Label>
                  <PhoneInput
                    id="client-settings-phone"
                    value={phone}
                    onChange={setPhone}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 max-w-sm">
                  <div className="space-y-2">
                    <Label htmlFor="client-settings-country">Страна</Label>
                    <CountryAutocomplete
                      id="client-settings-country"
                      value={country}
                      onChange={(name, code) => {
                        setCountry(name);
                        setCountryCode(code || null);
                        if (!name) setCity("");
                      }}
                      placeholder="Начните вводить страну"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-settings-city">Город</Label>
                    <CityAutocomplete
                      id="client-settings-city"
                      value={city}
                      onChange={setCity}
                      countryCode={countryCode}
                      placeholder="Начните вводить город"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Пол</Label>
                  <RadioGroup
                    value={gender}
                    onValueChange={setGender}
                    className="flex flex-wrap gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="male" id="client-gender-male" />
                      <Label htmlFor="client-gender-male" className="font-normal cursor-pointer">
                        Мужской
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="female" id="client-gender-female" />
                      <Label htmlFor="client-gender-female" className="font-normal cursor-pointer">
                        Женский
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2 max-w-xs">
                  <Label htmlFor="client-marital">Семейное положение</Label>
                  <Select value={maritalStatus || "unspecified"} onValueChange={setMaritalStatus}>
                    <SelectTrigger id="client-marital">
                      <SelectValue placeholder="Выберите" />
                    </SelectTrigger>
                    <SelectContent>
                      {MARITAL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={saving || !hasProfileChanges}>
                  {saving ? "Сохранение…" : "Сохранить"}
                </Button>
              </form>
            </Section>
          )}
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          {activeTab === "security" && (
            <Section title="Смена пароля">
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
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
            </Section>
          )}
        </TabsContent>

        <TabsContent value="accounts" className="mt-4">
          {activeTab === "accounts" && (
            <Section title="Привязка аккаунтов">
              <p className="text-sm text-muted-foreground mb-4">
                Привяжите Google или Apple, чтобы входить без пароля и использовать аватар из профиля.
              </p>
              <div className="flex flex-wrap gap-2">
                {hasGoogle ? (
                  <span className="inline-flex items-center rounded-md bg-muted px-3 py-1.5 text-xs font-medium">
                  <span className="mr-1 inline-flex h-4 w-4 items-center justify-center">
                    <svg
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      width="16"
                      height="16"
                      className="block"
                    >
                      <g clipPath="url(#gh_google_clip_client)">
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
                        <clipPath id="gh_google_clip_client">
                          <rect width="16" height="16" fill="white" />
                        </clipPath>
                      </defs>
                    </svg>
                  </span>
                    Google привязан
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => signIn("google", { callbackUrl: "/client/settings" })}
                  >
                    <span className="flex items-center gap-1">
                      <span className="inline-flex h-4 w-4 items-center justify-center">
                        <svg
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 16 16"
                          width="16"
                          height="16"
                          className="block"
                        >
                          <g clipPath="url(#gh_google_clip_client_btn)">
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
                            <clipPath id="gh_google_clip_client_btn">
                              <rect width="16" height="16" fill="white" />
                            </clipPath>
                          </defs>
                        </svg>
                      </span>
                      <span>Привязать Google</span>
                    </span>
                  </Button>
                )}
                {hasApple ? (
                  <span className="inline-flex items-center rounded-md bg-muted px-3 py-1.5 text-xs font-medium">
                  <span className="mr-1 inline-flex h-4 w-4 items-center justify-center relative -top-px">
                    <svg
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      width="16"
                      height="16"
                      className="block"
                    >
                      <g clipPath="url(#gh_apple_clip_client)">
                        <path
                          d="M8.08803 4.3535C8.74395 4.3535 9.56615 3.91006 10.0558 3.31881C10.4992 2.78299 10.8226 2.03469 10.8226 1.28639C10.8226 1.18477 10.8133 1.08314 10.7948 1C10.065 1.02771 9.18738 1.48963 8.6608 2.10859C8.24508 2.57975 7.86631 3.31881 7.86631 4.07635C7.86631 4.18721 7.88479 4.29807 7.89402 4.33502C7.94021 4.34426 8.01412 4.3535 8.08803 4.3535ZM5.77846 15.5318C6.67457 15.5318 7.07182 14.9313 8.18965 14.9313C9.32596 14.9313 9.57539 15.5133 10.5731 15.5133C11.5524 15.5133 12.2083 14.608 12.8273 13.7211C13.5201 12.7049 13.8065 11.7072 13.825 11.661C13.7603 11.6425 11.885 10.8757 11.885 8.7232C11.885 6.85707 13.3631 6.01639 13.4462 5.95172C12.467 4.5475 10.9796 4.51055 10.5731 4.51055C9.47377 4.51055 8.57766 5.1757 8.01412 5.1757C7.4044 5.1757 6.60066 4.5475 5.64912 4.5475C3.83842 4.5475 2 6.0441 2 8.87101C2 10.6263 2.68363 12.4832 3.52432 13.6842C4.2449 14.7004 4.87311 15.5318 5.77846 15.5318Z"
                          fill="currentColor"
                        />
                      </g>
                      <defs>
                        <clipPath id="gh_apple_clip_client">
                          <rect width="16" height="16" />
                        </clipPath>
                      </defs>
                    </svg>
                  </span>
                    Apple привязан
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => signIn("apple", { callbackUrl: "/client/settings" })}
                  >
                    <span className="flex items-center gap-1">
                      <span className="inline-flex h-4 w-4 items-center justify-center relative -top-px">
                        <svg
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 16 16"
                          width="16"
                          height="16"
                          className="block"
                        >
                          <g clipPath="url(#gh_apple_clip_client_btn)">
                            <path
                              d="M8.08803 4.3535C8.74395 4.3535 9.56615 3.91006 10.0558 3.31881C10.4992 2.78299 10.8226 2.03469 10.8226 1.28639C10.8226 1.18477 10.8133 1.08314 10.7948 1C10.065 1.02771 9.18738 1.48963 8.6608 2.10859C8.24508 2.57975 7.86631 3.31881 7.86631 4.07635C7.86631 4.18721 7.88479 4.29807 7.89402 4.33502C7.94021 4.34426 8.01412 4.3535 8.08803 4.3535ZM5.77846 15.5318C6.67457 15.5318 7.07182 14.9313 8.18965 14.9313C9.32596 14.9313 9.57539 15.5133 10.5731 15.5133C11.5524 15.5133 12.2083 14.608 12.8273 13.7211C13.5201 12.7049 13.8065 11.7072 13.825 11.661C13.7603 11.6425 11.885 10.8757 11.885 8.7232C11.885 6.85707 13.3631 6.01639 13.4462 5.95172C12.467 4.5475 10.9796 4.51055 10.5731 4.51055C9.47377 4.51055 8.57766 5.1757 8.01412 5.1757C7.4044 5.1757 6.60066 4.5475 5.64912 4.5475C3.83842 4.5475 2 6.0441 2 8.87101C2 10.6263 2.68363 12.4832 3.52432 13.6842C4.2449 14.7004 4.87311 15.5318 5.77846 15.5318Z"
                              fill="currentColor"
                            />
                          </g>
                          <defs>
                            <clipPath id="gh_apple_clip_client_btn">
                              <rect width="16" height="16" />
                            </clipPath>
                          </defs>
                        </svg>
                      </span>
                      <span>Привязать Apple</span>
                    </span>
                  </Button>
                )}
                <div className="w-full border-t pt-3 mt-2">
                  <p className="text-xs text-muted-foreground mb-2">Telegram — уведомления и бот</p>
                  <TelegramAccountBlock />
                </div>
              </div>
            </Section>
          )}
        </TabsContent>
      </Tabs>
    </SettingsFormErrorBoundary>
  );
}
