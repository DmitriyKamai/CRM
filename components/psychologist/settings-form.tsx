"use client";

import React, { Component, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { signIn } from "next-auth/react";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  DEFAULT_COUNTRY_NAME,
  DEFAULT_COUNTRY_CODE,
  getCountryCodeByName
} from "@/lib/data/countries-ru";
import { Calendar as CalendarIcon, User, Lock, Link2, CalendarDays, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
// Calendar (react-day-picker + date-fns locale) lazily loaded to reduce initial compilation size
const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((m) => ({ default: m.Calendar })),
  { ssr: false }
);
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
const CountryAutocomplete = dynamic(
  () => import("@/components/ui/location-autocomplete").then((m) => ({ default: m.CountryAutocomplete })),
  { ssr: false }
);
const CityAutocomplete = dynamic(
  () => import("@/components/ui/location-autocomplete").then((m) => ({ default: m.CityAutocomplete })),
  { ssr: false }
);
const CalendarSubscriptionBlock = dynamic(
  () => import("@/components/schedule/calendar-subscription").then((m) => ({ default: m.CalendarSubscriptionBlock })),
  { ssr: false }
);
const TelegramAccountBlock = dynamic(
  () => import("@/components/account/telegram-account-block").then((m) => ({ default: m.TelegramAccountBlock })),
  { ssr: false }
);

const MARITAL_OPTIONS: { value: string; label: string }[] = [
  { value: "single", label: "Не в браке" },
  { value: "married", label: "В браке" },
  { value: "divorced", label: "В разводе" },
  { value: "widowed", label: "Вдовец / Вдова" },
  { value: "unspecified", label: "Не указано" }
];

const PROFESSION_OPTIONS: { value: string; label: string }[] = [
  { value: "psychologist", label: "Психолог" },
  { value: "psychotherapist", label: "Врач-психотерапевт" },
  { value: "psychiatrist", label: "Психиатр" }
];

/** Максимум символов в блоке «О себе» */
const BIO_MAX_LENGTH = 1500;

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
    country: string | null;
    city: string | null;
    gender: string | null;
    maritalStatus: string | null;
    specialization: string | null;
    bio: string | null;
  } | null;
};

type Account = { provider: string; label: string };

/** Перехватывает ошибки рендера контента настроек и логирует их. */
class SettingsFormErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, message: (error as Error)?.message ?? String(error) };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("[SettingsForm] render error:", error, info?.componentStack);
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

export function PsychologistSettingsForm() {
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
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [gender, setGender] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [bio, setBio] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [savingProfessional, setSavingProfessional] = useState(false);

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
          setFirstName(p.psychologistProfile?.firstName ?? p.user?.name ?? "");
          setLastName(p.psychologistProfile?.lastName ?? "");
          setEmail(p.user?.email ?? "");
          setPhone(p.psychologistProfile?.phone ?? "");
          setDateOfBirth(p.user?.dateOfBirth ?? "");
          setCountry(
            p.psychologistProfile?.country ?? DEFAULT_COUNTRY_NAME
          );
          setCity(p.psychologistProfile?.city ?? "");
          setGender(p.psychologistProfile?.gender ?? "");
          setMaritalStatus(p.psychologistProfile?.maritalStatus ?? "");
          setBio(p.psychologistProfile?.bio ?? "");
          setSpecialization(p.psychologistProfile?.specialization ?? "");
          setCountryCode(
            p.psychologistProfile?.country
              ? getCountryCodeByName(p.psychologistProfile.country) ?? null
              : DEFAULT_COUNTRY_CODE
          );
        }
        return fetch("/api/user/accounts");
      })
      .then((r) => (r?.ok ? r.json() : { accounts: [] }))
      .then((a) => {
        if (!cancelled && a?.accounts) setAccounts(a.accounts);
        if (!cancelled) setLoading(false);
      })
      .catch((err) => {
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
          country: country.trim() || null,
          city: city.trim() || null,
          gender: gender || null,
          maritalStatus: maritalStatus || null,
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
                ? {
                    ...prev.psychologistProfile,
                    firstName,
                    lastName,
                    phone: phone.trim() || null,
                    country: country.trim() || null,
                    city: city.trim() || null,
                    gender: gender || null,
                    maritalStatus: maritalStatus || null
                  }
                : {
                    firstName,
                    lastName,
                    phone: phone.trim() || null,
                    country: country.trim() || null,
                    city: city.trim() || null,
                    gender: gender || null,
                    maritalStatus: maritalStatus || null,
                    specialization: null,
                    bio: null
                  }
            }
          : null
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveProfessional(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSavingProfessional(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: bio.trim() || null,
          specialization: specialization || null
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Не удалось сохранить");
        return;
      }
      toast.success("Сохранено");
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              psychologistProfile: prev.psychologistProfile
                ? {
                    ...prev.psychologistProfile,
                    bio: bio.trim() || null,
                    specialization: specialization || null
                  }
                : prev.psychologistProfile
            }
          : null
      );
    } finally {
      setSavingProfessional(false);
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

  if (!profile.user) {
    return (
      <div className="text-sm text-muted-foreground py-8">
        Не удалось загрузить настройки. Обновите страницу.
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
  const savedCountry = profile.psychologistProfile?.country ?? "";
  const savedCity = profile.psychologistProfile?.city ?? "";
  const savedGender = profile.psychologistProfile?.gender ?? "";
  const savedMaritalStatus = profile.psychologistProfile?.maritalStatus ?? "";
  const hasProfileChanges =
    firstName !== savedFirstName ||
    lastName !== savedLastName ||
    (email.trim().toLowerCase()) !== savedEmail.trim().toLowerCase() ||
    (phone.trim() || "") !== (savedPhone || "") ||
    (dateOfBirth || "") !== (savedDateOfBirth || "") ||
    (country.trim() || "") !== (savedCountry || "") ||
    (city.trim() || "") !== (savedCity || "") ||
    (gender || "") !== (savedGender || "") ||
    (maritalStatus || "") !== (savedMaritalStatus || "");

  const savedBio = profile.psychologistProfile?.bio ?? "";
  const savedSpecialization = profile.psychologistProfile?.specialization ?? "";
  const hasProfessionalChanges =
    (bio.trim() || "") !== (savedBio || "") ||
    (specialization || "") !== (savedSpecialization || "");

  return (
    <SettingsFormErrorBoundary>
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v ?? "profile")} className="w-full">
      <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1 bg-muted/80">
        <TabsTrigger value="profile" className="flex items-center gap-2 shrink-0">
          <User className="h-4 w-4" />
          Личные данные
        </TabsTrigger>
        <TabsTrigger value="professional" className="flex items-center gap-2 shrink-0">
          <Briefcase className="h-4 w-4" />
          Профиль
        </TabsTrigger>
        <TabsTrigger value="security" className="flex items-center gap-2 shrink-0">
          <Lock className="h-4 w-4" />
          Безопасность
        </TabsTrigger>
        <TabsTrigger value="accounts" className="flex items-center gap-2 shrink-0">
          <Link2 className="h-4 w-4" />
          Аккаунты
        </TabsTrigger>
        <TabsTrigger value="calendar" className="flex items-center gap-2 shrink-0">
          <CalendarDays className="h-4 w-4" />
          Календарь
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-4">
        {activeTab === "profile" && (
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
            <div className="grid gap-4 sm:grid-cols-2 max-w-sm">
              <div className="space-y-2">
                <Label htmlFor="country">Страна</Label>
                <CountryAutocomplete
                  id="country"
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
                <Label htmlFor="city">Город</Label>
                <CityAutocomplete
                  id="city"
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
                  <RadioGroupItem value="male" id="gender-male" />
                  <Label htmlFor="gender-male" className="font-normal cursor-pointer">
                    Мужской
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="female" id="gender-female" />
                  <Label htmlFor="gender-female" className="font-normal cursor-pointer">
                    Женский
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="marital">Семейное положение</Label>
              <Select value={maritalStatus || "unspecified"} onValueChange={setMaritalStatus}>
                <SelectTrigger id="marital">
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
                <span className="mr-1 inline-flex h-3 w-3 items-center justify-center">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3">
                    <path
                      fill="#EA4335"
                      d="M12 10.2v3.6h5.1C16.7 16.7 14.7 18 12 18c-3.3 0-6-2.7-6-6s2.7-6 6-6c1.6 0 3 .6 4.1 1.6l2.5-2.5C16.9 3.3 14.6 2.4 12 2.4 6.9 2.4 2.7 6.6 2.7 11.7S6.9 21 12 21c5 0 8.7-3.5 8.7-8.4 0-.6-.1-1.1-.2-1.6H12z"
                    />
                  </svg>
                </span>
                Google привязан
              </span>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => signIn("google", { callbackUrl: "/psychologist/settings" })}
              >
                <span className="flex items-center gap-1">
                  <span className="inline-flex h-3 w-3 items-center justify-center">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3">
                      <path
                        fill="#EA4335"
                        d="M12 10.2v3.6h5.1C16.7 16.7 14.7 18 12 18c-3.3 0-6-2.7-6-6s2.7-6 6-6c1.6 0 3 .6 4.1 1.6l2.5-2.5C16.9 3.3 14.6 2.4 12 2.4 6.9 2.4 2.7 6.6 2.7 11.7S6.9 21 12 21c5 0 8.7-3.5 8.7-8.4 0-.6-.1-1.1-.2-1.6H12z"
                      />
                    </svg>
                  </span>
                  <span>Привязать Google</span>
                </span>
              </Button>
            )}
            {hasApple ? (
              <span className="inline-flex items-center rounded-md bg-muted px-3 py-1.5 text-xs font-medium">
                <span className="mr-1 inline-flex h-3 w-3 items-center justify-center">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 fill-foreground">
                    <path d="M16.7 2.4c0 1-.4 1.9-1 2.6-.7.8-1.9 1.4-2.9 1.3-.1-1 .4-2 .9-2.6.7-.8 1.9-1.4 3-1.5.1.1.1.1 0 .2zm2.3 6.5c-.1.1-1.6.9-1.6 2.6 0 2.1 2 2.8 2 2.8 0 .1-.3 1-1 2-.6.9-1.3 1.8-2.3 1.8-.9 0-1.2-.6-2.4-.6s-1.6.6-2.5.6c-1 .1-1.9-1-2.5-1.9-1.4-1.9-2.5-5.3-1-7.6.7-1.1 1.9-1.8 3.1-1.8 1.2 0 2 .6 3 0 .2-.1 1.4-.8 2.6-.7.4.1 1.6.1 2.6 1.2z" />
                  </svg>
                </span>
                Apple привязан
              </span>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => signIn("apple", { callbackUrl: "/psychologist/settings" })}
              >
                <span className="flex items-center gap-1">
                  <span className="inline-flex h-3 w-3 items-center justify-center">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 fill-foreground">
                      <path d="M16.7 2.4c0 1-.4 1.9-1 2.6-.7.8-1.9 1.4-2.9 1.3-.1-1 .4-2 .9-2.6.7-.8 1.9-1.4 3-1.5.1.1.1.1 0 .2zm2.3 6.5c-.1.1-1.6.9-1.6 2.6 0 2.1 2 2.8 2 2.8 0 .1-.3 1-1 2-.6.9-1.3 1.8-2.3 1.8-.9 0-1.2-.6-2.4-.6s-1.6.6-2.5.6c-1 .1-1.9-1-2.5-1.9-1.4-1.9-2.5-5.3-1-7.6.7-1.1 1.9-1.8 3.1-1.8 1.2 0 2 .6 3 0 .2-.1 1.4-.8 2.6-.7.4.1 1.6.1 2.6 1.2z" />
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

      <TabsContent value="calendar" className="mt-4">
        {activeTab === "calendar" && (
        <Section title="Подписка на календарь">
          <CalendarSubscriptionBlock />
        </Section>
        )}
      </TabsContent>

      <TabsContent value="professional" className="mt-4">
        {activeTab === "professional" && (
        <Section title="Профессиональный профиль">
          <form onSubmit={handleSaveProfessional} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bio">О себе</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Кратко расскажите о себе и подходе к работе"
                className="min-h-[120px] resize-none"
                rows={5}
                maxLength={BIO_MAX_LENGTH}
              />
              <p className="text-xs text-muted-foreground">
                {bio.length} / {BIO_MAX_LENGTH}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Профессия</Label>
              <RadioGroup
                value={specialization}
                onValueChange={setSpecialization}
                className="flex flex-wrap gap-4"
              >
                {PROFESSION_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center gap-2">
                    <RadioGroupItem value={opt.value} id={`prof-${opt.value}`} />
                    <Label
                      htmlFor={`prof-${opt.value}`}
                      className="font-normal cursor-pointer"
                    >
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <Button
              type="submit"
              disabled={savingProfessional || !hasProfessionalChanges}
            >
              {savingProfessional ? "Сохранение…" : "Сохранить"}
            </Button>
          </form>
        </Section>
        )}
      </TabsContent>
    </Tabs>
    </SettingsFormErrorBoundary>
  );
}
