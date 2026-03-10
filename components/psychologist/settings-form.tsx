"use client";

import React, { Component, useCallback, useEffect, useState } from "react";
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
import { Calendar as CalendarIcon, User, Lock, Link2, CalendarDays, Briefcase, CheckCircle2, Circle, AlertCircle } from "lucide-react";
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
import { AvatarUploadBlock } from "@/components/account/avatar-upload-block";
import { ProfilePhotoUploadBlock } from "@/components/psychologist/profile-photo-upload-block";
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
    profilePhotoUrl: string | null;
    profilePublished: boolean;
    contactPhone: string | null;
    contactTelegram: string | null;
    contactViber: string | null;
    contactWhatsapp: string | null;
  } | null;
};

type Account = { provider: string; label: string };

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
  const [contactPhone, setContactPhone] = useState("");
  const [contactTelegram, setContactTelegram] = useState("");
  const [contactViber, setContactViber] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [newPasswordChecks, setNewPasswordChecks] = useState<PasswordChecks>(
    () => evaluatePassword("")
  );
  const [touchedNewPassword, setTouchedNewPassword] = useState(false);
  const [savingProfessional, setSavingProfessional] = useState(false);
  const [profilePublished, setProfilePublished] = useState(false);
  const [savingPublish, setSavingPublish] = useState(false);
  const [unlinkAccountProvider, setUnlinkAccountProvider] = useState<"google" | "apple" | null>(null);

  const refetchAccounts = useCallback(() => {
    fetch("/api/user/accounts")
      .then((r) => (r?.ok ? r.json() : { accounts: [] }))
      .then((a) => {
        if (a?.accounts) setAccounts(a.accounts);
      });
  }, []);

  const refetchProfile = useCallback(() => {
    fetch("/api/user/profile")
      .then((r) => (r?.ok ? r.json() : null))
      .then((p) => {
        if (p) {
          setProfile(p);
          setProfilePublished(p.psychologistProfile?.profilePublished ?? false);
        }
      });
  }, []);

  async function handlePublishProfileChange(published: boolean) {
    setSavingPublish(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilePublished: published })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Не удалось сохранить");
        return;
      }
      setProfilePublished(published);
      setProfile((prev): Profile | null =>
        prev?.psychologistProfile
          ? {
              ...prev,
              psychologistProfile: {
                ...prev.psychologistProfile,
                profilePhotoUrl: prev.psychologistProfile.profilePhotoUrl ?? null,
                profilePublished: published
              }
            }
          : prev
      );
      toast.success(published ? "Профиль опубликован" : "Профиль снят с публикации");
    } finally {
      setSavingPublish(false);
    }
  }

  async function handleUnlinkAccount(provider: "google" | "apple") {
    setUnlinkAccountProvider(provider);
    try {
      const res = await fetch(`/api/user/accounts?provider=${provider}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Не удалось отвязать");
        return;
      }
      toast.success(provider === "google" ? "Google отвязан" : "Apple отвязан");
      refetchAccounts();
      updateSession?.();
    } finally {
      setUnlinkAccountProvider(null);
    }
  }

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
          setContactPhone(p.psychologistProfile?.contactPhone ?? "");
          setContactTelegram(p.psychologistProfile?.contactTelegram ?? "");
          setContactViber(p.psychologistProfile?.contactViber ?? "");
          setContactWhatsapp(p.psychologistProfile?.contactWhatsapp ?? "");
          setProfilePublished(p.psychologistProfile?.profilePublished ?? false);
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
      setProfile((prev): Profile | null =>
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
                    bio: null,
                    profilePhotoUrl: null,
                    profilePublished: false,
                    contactPhone: null,
                    contactTelegram: null,
                    contactViber: null,
                    contactWhatsapp: null
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
          specialization: specialization || null,
          contactPhone: contactPhone.trim() || null,
          contactTelegram: contactTelegram.trim() || null,
          contactViber: contactViber.trim() || null,
          contactWhatsapp: contactWhatsapp.trim() || null
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Не удалось сохранить");
        return;
      }
      toast.success("Сохранено");
      setProfile((prev): Profile | null =>
        prev
          ? {
              ...prev,
              psychologistProfile: prev.psychologistProfile
                ? {
                    ...prev.psychologistProfile,
                    bio: bio.trim() || null,
                    specialization: specialization || null,
                    profilePhotoUrl: prev.psychologistProfile.profilePhotoUrl ?? null,
                    profilePublished: prev.psychologistProfile.profilePublished,
                    contactPhone: contactPhone.trim() || null,
                    contactTelegram: contactTelegram.trim() || null,
                    contactViber: contactViber.trim() || null,
                    contactWhatsapp: contactWhatsapp.trim() || null
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
    const checks = evaluatePassword(newPassword);
    const error = getPasswordError(newPassword, checks);
    if (error) {
      toast.error(error);
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
  const savedContactPhone = profile.psychologistProfile?.contactPhone ?? "";
  const savedContactTelegram = profile.psychologistProfile?.contactTelegram ?? "";
  const savedContactViber = profile.psychologistProfile?.contactViber ?? "";
  const savedContactWhatsapp = profile.psychologistProfile?.contactWhatsapp ?? "";
  const hasProfessionalChanges =
    (bio.trim() || "") !== (savedBio || "") ||
    (specialization || "") !== (savedSpecialization || "") ||
    (contactPhone.trim() || "") !== (savedContactPhone || "") ||
    (contactTelegram.trim() || "") !== (savedContactTelegram || "") ||
    (contactViber.trim() || "") !== (savedContactViber || "") ||
    (contactWhatsapp.trim() || "") !== (savedContactWhatsapp || "");

  const newPasswordError = touchedNewPassword
    ? getPasswordError(newPassword, newPasswordChecks)
    : null;
  const newPasswordValid = !!newPassword && !newPasswordError;

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
        <>
        <Section title="Личные данные">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <AvatarUploadBlock
              image={image}
              initials={initials}
              alt={name}
              onSuccess={() => updateSession?.()}
            />
            <div className="space-y-2 max-w-sm">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                autoComplete="email"
                maxLength={64}
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
                  maxLength={32}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Фамилия</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Фамилия"
                  maxLength={32}
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
        </>
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
                onChange={(e) => {
                  const value = e.target.value;
                  setNewPassword(value);
                  setNewPasswordChecks(evaluatePassword(value));
                  if (!touchedNewPassword) setTouchedNewPassword(true);
                }}
                autoComplete="new-password"
                minLength={8}
                className={
                  newPasswordError
                    ? "border-destructive focus-visible:ring-destructive"
                    : newPasswordValid
                    ? "border-emerald-500 focus-visible:ring-emerald-500"
                    : undefined
                }
              />
              {newPasswordError && (
                <p className="text-xs text-destructive flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{newPasswordError}</span>
                </p>
              )}
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
            Привяжите Google, чтобы входить без пароля и использовать аватар из профиля.
          </p>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
            {hasGoogle ? (
              <>
                <span className="inline-flex min-w-0 items-center gap-2 rounded-lg bg-muted px-4 py-2.5 text-sm font-medium">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="20" height="20" className="block">
                      <path d="M8.00018 3.16667C9.18018 3.16667 10.2368 3.57333 11.0702 4.36667L13.3535 2.08333C11.9668 0.793333 10.1568 0 8.00018 0C4.87352 0 2.17018 1.79333 0.853516 4.40667L3.51352 6.47C4.14352 4.57333 5.91352 3.16667 8.00018 3.16667Z" fill="#EA4335" />
                      <path d="M15.66 8.18335C15.66 7.66002 15.61 7.15335 15.5333 6.66669H8V9.67335H12.3133C12.12 10.66 11.56 11.5 10.72 12.0667L13.2967 14.0667C14.8 12.6734 15.66 10.6134 15.66 8.18335Z" fill="#4285F4" />
                      <path d="M3.51 9.53001C3.35 9.04668 3.25667 8.53334 3.25667 8.00001C3.25667 7.46668 3.34667 6.95334 3.51 6.47001L0.85 4.40668C0.306667 5.48668 0 6.70668 0 8.00001C0 9.29334 0.306667 10.5133 0.853333 11.5933L3.51 9.53001Z" fill="#FBBC05" />
                      <path d="M8.0001 16C10.1601 16 11.9768 15.29 13.2968 14.0633L10.7201 12.0633C10.0034 12.5467 9.0801 12.83 8.0001 12.83C5.91343 12.83 4.14343 11.4233 3.5101 9.52667L0.850098 11.59C2.1701 14.2067 4.87343 16 8.0001 16Z" fill="#34A853" />
                    </svg>
                  </span>
                  Google привязан
                  <a href="https://myaccount.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
                    Перейти в аккаунт
                  </a>
                </span>
                <Button type="button" variant="outline" size="sm" disabled={unlinkAccountProvider !== null} onClick={() => handleUnlinkAccount("google")}>
                  {unlinkAccountProvider === "google" ? "Отвязка…" : "Отвязать"}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  await fetch("/api/auth/oauth-link-intent", { method: "POST" });
                  signIn("google", { callbackUrl: "/psychologist/settings" });
                }}
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
                      <g clipPath="url(#gh_google_clip_psy_btn)">
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
                        <clipPath id="gh_google_clip_psy_btn">
                          <rect width="16" height="16" fill="white" />
                        </clipPath>
                      </defs>
                    </svg>
                  </span>
                  <span>Привязать Google</span>
                </span>
              </Button>
            )}
            </div>
            {/* Apple OAuth будет включён позже */}
            <div className="border-t pt-3">
              <p className="text-sm text-muted-foreground mb-2">Telegram — уведомления и бот</p>
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
          <ProfilePhotoUploadBlock
            profilePhotoUrl={profile.psychologistProfile?.profilePhotoUrl ?? null}
            profilePublished={profilePublished}
            initials={initials}
            alt={name || "Психолог"}
            onSuccess={refetchProfile}
            onPublishChange={handlePublishProfileChange}
            publishSaving={savingPublish}
          />
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
            <div className="space-y-2">
              <Label htmlFor="contact-phone">Контактный телефон для клиентов</Label>
              <Input
                id="contact-phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+7 999 123-45-67"
                maxLength={32}
              />
              <p className="text-xs text-muted-foreground">
                Этот номер будет виден клиентам в вашем профиле.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="contact-telegram">Telegram</Label>
                <Input
                  id="contact-telegram"
                  value={contactTelegram}
                  onChange={(e) => setContactTelegram(e.target.value)}
                  placeholder="@username или ссылка"
                  maxLength={128}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-viber">Viber</Label>
                <Input
                  id="contact-viber"
                  value={contactViber}
                  onChange={(e) => setContactViber(e.target.value)}
                  placeholder="Номер или ссылка"
                  maxLength={128}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-whatsapp">WhatsApp</Label>
                <Input
                  id="contact-whatsapp"
                  value={contactWhatsapp}
                  onChange={(e) => setContactWhatsapp(e.target.value)}
                  placeholder="Номер или ссылка"
                  maxLength={128}
                />
              </div>
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
