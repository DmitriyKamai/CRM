"use client";

import React, { Component, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  DEFAULT_COUNTRY_NAME,
  DEFAULT_COUNTRY_CODE,
  getCountryCodeByName
} from "@/lib/data/countries-ru";
import { shouldCloseCalendarPopoverAfterSelect } from "@/lib/close-calendar-popover";
import { Calendar as CalendarIcon, User, Lock, Link2, CalendarDays, Briefcase, ListChecks, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
// Calendar (react-day-picker + date-fns locale) lazily loaded to reduce initial compilation size
const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((m) => ({ default: m.Calendar })),
  { ssr: false }
);
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
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
const TelegramAccountBlock = dynamic(
  () => import("@/components/account/telegram-account-block").then((m) => ({ default: m.TelegramAccountBlock })),
  { ssr: false }
);
import { useProfileSettings } from "@/hooks/use-profile-settings";
import { useCustomFieldsSettings } from "@/hooks/use-custom-fields-settings";
import { useCustomFieldsTabUi } from "@/hooks/use-custom-fields-tab-ui";
import { useClientStatusesSettings } from "@/hooks/use-client-statuses-settings";
import { SecurityTabForm } from "@/components/psychologist/settings/security-tab";
import { AccountsTabContent } from "@/components/psychologist/settings/accounts-tab";
import { CustomFieldsTabPanel } from "@/components/psychologist/settings/custom-fields-tab-panel";
import { ClientStatusesTabPanel } from "@/components/psychologist/settings/client-statuses-tab-panel";
import { ProfessionalTabPanel } from "@/components/psychologist/settings/professional-tab-panel";

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

type PasswordChecks = {
  length: boolean;
  letters: boolean;
  digits: boolean;
  special: boolean;
};

const CUSTOM_FIELD_TYPE_LABELS: Record<string, string> = {
  TEXT: "Текст (одна строка)",
  MULTILINE: "Текст (несколько строк)",
  NUMBER: "Число",
  DATE: "Дата",
  BOOLEAN: "Флажок",
  SELECT: "Выбор из списка (один вариант)",
  MULTI_SELECT: "Выбор из списка (несколько вариантов)"
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

export function PsychologistSettingsForm({
  schedulingEnabled = true
}: {
  schedulingEnabled?: boolean;
}) {
  const { data: session, update: updateSession } = useSession();
  const {
    profile,
    loading,
    accounts,
    refetchProfile,
    refetchAccounts,
    updateProfileInCache
  } = useProfileSettings();
  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [dobPopoverOpen, setDobPopoverOpen] = useState(false);
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

  const handleNewPasswordChange = (value: string) => {
    setNewPassword(value);
    setNewPasswordChecks(evaluatePassword(value));
    if (!touchedNewPassword) setTouchedNewPassword(true);
  };
  const [savingProfessional, setSavingProfessional] = useState(false);
  const [profilePhotoPublished, setProfilePhotoPublished] = useState(false);
  const [savingPublish, setSavingPublish] = useState(false);
  const [unlinkAccountProvider, setUnlinkAccountProvider] = useState<"google" | "apple" | null>(null);
  const {
    customFields,
    customFieldsLoading,
    customFieldsError: customFieldsQueryError,
    refetchCustomFields
  } = useCustomFieldsSettings(activeTab === "customFields");
  const {
    effectiveCustomFieldsError,
    setCustomFieldsError,

    // Вкладки
    newTabName,
    setNewTabName,
    newTabDescription,
    setNewTabDescription,
    editingTabGroup,
    setEditingTabGroup,
    editingTabName,
    setEditingTabName,
    editingTabDescription,
    setEditingTabDescription,
    setLocalTabs,
    createTabDialogOpen,
    setCreateTabDialogOpen,
    allTabsForList,
    availableTabs,

    // Поля
    newFieldLabel,
    setNewFieldLabel,
    newFieldGroup,
    setNewFieldGroup,
    newFieldType,
    setNewFieldType,
    newFieldOptionLabels,
    setNewFieldOptionLabels,
    editingFieldId,
    setEditingFieldId,
    editingLabel,
    setEditingLabel,
    editingGroup,
    setEditingGroup,
    editingDescription,
    setEditingDescription,

    // Доступно тем компонентам, где нужна только часть API
    // (например, newFieldType/OptionLabels и т.п.)
  } = useCustomFieldsTabUi({
    customFields,
    customFieldsQueryError
  });
  const STATUS_COLOR_PRESETS: { value: string }[] = [
    { value: "hsl(217 91% 60%)" },
    { value: "hsl(142 76% 36%)" },
    { value: "hsl(43 96% 56%)" },
    { value: "hsl(0 84% 60%)" },
    { value: "hsl(280 65% 60%)" },
    { value: "hsl(24 95% 53%)" },
    { value: "hsl(326 78% 60%)" },
    { value: "hsl(199 89% 48%)" },
    { value: "hsl(215 16% 47%)" }
  ];
  const {
    clientStatuses,
    clientStatusesLoading,
    refetchClientStatuses
  } = useClientStatusesSettings(activeTab === "statuses");
  const [newStatusLabel, setNewStatusLabel] = useState("");
  const [newStatusColor, setNewStatusColor] = useState(STATUS_COLOR_PRESETS[0]?.value ?? "hsl(217 91% 60%)");
  const [addStatusDialogOpen, setAddStatusDialogOpen] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editingStatusLabel, setEditingStatusLabel] = useState("");
  const [editingStatusColor, setEditingStatusColor] = useState("");

  useEffect(() => {
    if (!schedulingEnabled && activeTab === "calendar") setActiveTab("profile");
  }, [schedulingEnabled, activeTab]);

  async function handlePublishProfileChange(published: boolean) {
    setSavingPublish(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilePhotoPublished: published })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Не удалось сохранить");
        return;
      }
      setProfilePhotoPublished(published);
      updateProfileInCache(prev =>
        prev?.psychologistProfile
          ? {
              ...prev,
              psychologistProfile: {
                ...prev.psychologistProfile,
                profilePhotoUrl: prev.psychologistProfile.profilePhotoUrl ?? null,
                profilePhotoPublished: published
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
      void refetchAccounts();
      updateSession?.();
    } finally {
      setUnlinkAccountProvider(null);
    }
  }

  async function handleLinkGoogle() {
    await fetch("/api/auth/oauth-link-intent", { method: "POST" });
    signIn("google", { callbackUrl: "/psychologist/settings" });
  }

  const [formHydrated, setFormHydrated] = useState(false);
  useEffect(() => {
    if (!profile || formHydrated) return;
    setFormHydrated(true);
    setFirstName(profile.psychologistProfile?.firstName ?? profile.user?.name ?? "");
    setLastName(profile.psychologistProfile?.lastName ?? "");
    setEmail(profile.user?.email ?? "");
    setPhone(profile.psychologistProfile?.phone ?? "");
    setDateOfBirth(profile.user?.dateOfBirth ?? "");
    setCountry(profile.psychologistProfile?.country ?? DEFAULT_COUNTRY_NAME);
    setCity(profile.psychologistProfile?.city ?? "");
    setGender(profile.psychologistProfile?.gender ?? "");
    setMaritalStatus(profile.psychologistProfile?.maritalStatus ?? "");
    setBio(profile.psychologistProfile?.bio ?? "");
    setSpecialization(profile.psychologistProfile?.specialization ?? "");
    setContactPhone(profile.psychologistProfile?.contactPhone ?? "");
    setContactTelegram(profile.psychologistProfile?.contactTelegram ?? "");
    setContactViber(profile.psychologistProfile?.contactViber ?? "");
    setContactWhatsapp(profile.psychologistProfile?.contactWhatsapp ?? "");
    setProfilePhotoPublished(profile.psychologistProfile?.profilePhotoPublished ?? false);
    setCountryCode(
      profile.psychologistProfile?.country
        ? getCountryCodeByName(profile.psychologistProfile.country) ?? null
        : DEFAULT_COUNTRY_CODE
    );
  }, [profile, formHydrated]);

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
      updateProfileInCache(prev => ({
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
              profilePhotoPublished: false,
              contactPhone: null,
              contactTelegram: null,
              contactViber: null,
              contactWhatsapp: null
            }
      }));
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
      updateProfileInCache(prev => ({
        ...prev,
        psychologistProfile: prev.psychologistProfile
          ? {
              ...prev.psychologistProfile,
              bio: bio.trim() || null,
              specialization: specialization || null,
              profilePhotoUrl: prev.psychologistProfile.profilePhotoUrl ?? null,
              profilePhotoPublished: prev.psychologistProfile.profilePhotoPublished,
              contactPhone: contactPhone.trim() || null,
              contactTelegram: contactTelegram.trim() || null,
              contactViber: contactViber.trim() || null,
              contactWhatsapp: contactWhatsapp.trim() || null
            }
          : prev.psychologistProfile
      }));
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

  const passwordRequirements = [
    { key: "length" as const, text: "Не менее 8 символов" },
    { key: "letters" as const, text: "Буквы (A–Z, а–я)" },
    { key: "digits" as const, text: "Цифры" },
    { key: "special" as const, text: "Спецсимволы (!, ?, % и т.п.)" }
  ];

  const passedCount = passwordRequirements.reduce((acc, req) => {
    return acc + (newPasswordChecks[req.key] ? 1 : 0);
  }, 0);

  const progressStage = !newPassword
    ? -1
    : passedCount <= 0
      ? -1
      : passedCount === 1
        ? 0
        : passedCount === 2
          ? 1
          : passedCount === 3
            ? 2
            : 3;

  const progressTrackColor =
    progressStage === -1
      ? "bg-muted/40"
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

  const progressFillWidthPct =
    passedCount === 0 ? 0 : (passedCount / 4) * 100;

  return (
    <SettingsFormErrorBoundary>
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v ?? "profile")} className="w-full">
      <TabsList className="flex h-auto w-full min-w-0 flex-wrap justify-start gap-1 bg-muted/80 p-1">
        <TabsTrigger
          value="profile"
          className="flex shrink-0 items-center gap-1.5 whitespace-normal px-2.5 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
        >
          <User className="h-4 w-4 shrink-0" />
          <span className="text-left leading-tight">Личные данные</span>
        </TabsTrigger>
        <TabsTrigger
          value="professional"
          className="flex shrink-0 items-center gap-1.5 whitespace-normal px-2.5 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
        >
          <Briefcase className="h-4 w-4 shrink-0" />
          <span className="text-left leading-tight">Профиль</span>
        </TabsTrigger>
        <TabsTrigger
          value="security"
          className="flex shrink-0 items-center gap-1.5 whitespace-normal px-2.5 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
        >
          <Lock className="h-4 w-4 shrink-0" />
          <span className="text-left leading-tight">Безопасность</span>
        </TabsTrigger>
        <TabsTrigger
          value="accounts"
          className="flex shrink-0 items-center gap-1.5 whitespace-normal px-2.5 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
        >
          <Link2 className="h-4 w-4 shrink-0" />
          <span className="text-left leading-tight">Аккаунты</span>
        </TabsTrigger>
        {schedulingEnabled && (
          <TabsTrigger
            value="calendar"
            className="flex shrink-0 items-center gap-1.5 whitespace-normal px-2.5 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
          >
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span className="text-left leading-tight">Календарь</span>
          </TabsTrigger>
        )}
        <TabsTrigger
          value="customFields"
          className="flex max-w-full min-w-0 shrink-0 items-center gap-1.5 whitespace-normal px-2.5 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
        >
          <ListChecks className="h-4 w-4 shrink-0" />
          <span className="min-w-0 text-left leading-tight">Поля клиента</span>
        </TabsTrigger>
        <TabsTrigger
          value="statuses"
          className="flex max-w-full min-w-0 shrink-0 items-center gap-1.5 whitespace-normal px-2.5 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
        >
          <ListFilter className="h-4 w-4 shrink-0" />
          <span className="min-w-0 text-left leading-tight">Статусы клиентов</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-4">
        {activeTab === "profile" && (
        <>
        <Section title="Личные данные">
          <form onSubmit={handleSaveProfile} className="space-y-5 max-w-2xl">
            <AvatarUploadBlock
              image={image}
              initials={initials}
              alt={name}
              onSuccess={() => updateSession?.()}
            />

            {/* Имя и фамилия */}
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

            {/* Email и телефон */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
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
              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <PhoneInput
                  id="phone"
                  value={phone}
                  onChange={(value) => setPhone(value)}
                />
              </div>
            </div>

            {/* Дата рождения и пол */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Дата рождения</Label>
                <Popover open={dobPopoverOpen} onOpenChange={setDobPopoverOpen}>
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
                      onSelect={d => {
                        setDateOfBirth(d ? format(d, "yyyy-MM-dd") : "");
                        if (shouldCloseCalendarPopoverAfterSelect()) setDobPopoverOpen(false);
                      }}
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
              <div className="space-y-2">
                <Label htmlFor="psychologist-gender">Пол</Label>
                <Select
                  value={gender || "unspecified"}
                  onValueChange={(value) => setGender(value === "unspecified" ? "" : value)}
                >
                  <SelectTrigger id="psychologist-gender">
                    <SelectValue placeholder="Выберите" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Мужской</SelectItem>
                    <SelectItem value="female">Женский</SelectItem>
                    <SelectItem value="unspecified">Не указано</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Страна, город и семейное положение */}
            <div className="grid gap-4 sm:grid-cols-3">
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
                  placeholder="Страна"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Город</Label>
                <CityAutocomplete
                  id="city"
                  value={city}
                  onChange={setCity}
                  countryCode={countryCode}
                  placeholder="Город"
                />
              </div>
              <div className="space-y-2">
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
          <SecurityTabForm
            handleChangePassword={handleChangePassword}
            currentPassword={currentPassword}
            onCurrentPasswordChange={setCurrentPassword}
            newPassword={newPassword}
            onNewPasswordChange={handleNewPasswordChange}
            newPasswordConfirm={newPasswordConfirm}
            onNewPasswordConfirmChange={setNewPasswordConfirm}
            newPasswordChecks={newPasswordChecks}
            newPasswordValid={newPasswordValid}
            passwordSaving={passwordSaving}
            passwordRequirements={passwordRequirements}
            progressTrackColor={progressTrackColor}
            progressFillColor={progressFillColor}
            progressFillWidthPct={progressFillWidthPct}
          />
        </Section>
        )}
      </TabsContent>

      <TabsContent value="accounts" className="mt-4">
        {activeTab === "accounts" && (
        <Section title="Привязка аккаунтов">
          <AccountsTabContent
            hasGoogle={hasGoogle}
            unlinkAccountProvider={unlinkAccountProvider}
            onUnlinkAccount={handleUnlinkAccount}
            onLinkGoogle={handleLinkGoogle}
            telegramBlock={<TelegramAccountBlock />}
          />
        </Section>
        )}
      </TabsContent>

      <TabsContent value="customFields" className="mt-4">
        {activeTab === "customFields" && (
          <Section title="Пользовательские поля клиента">
            <CustomFieldsTabPanel
              effectiveCustomFieldsError={effectiveCustomFieldsError}

              createTabDialogOpen={createTabDialogOpen}
              setCreateTabDialogOpen={setCreateTabDialogOpen}
              newTabName={newTabName}
              setNewTabName={setNewTabName}
              newTabDescription={newTabDescription}
              setNewTabDescription={setNewTabDescription}
              setLocalTabs={setLocalTabs}
              setNewFieldGroup={setNewFieldGroup}
              allTabsForList={allTabsForList}
              editingTabGroup={editingTabGroup}
              setEditingTabGroup={setEditingTabGroup}
              editingTabName={editingTabName}
              setEditingTabName={setEditingTabName}
              editingTabDescription={editingTabDescription}
              setEditingTabDescription={setEditingTabDescription}

              availableTabs={availableTabs}
              customFieldsLoading={customFieldsLoading}
              customFields={customFields}
              newFieldGroup={newFieldGroup}
              setNewFieldGroupRight={setNewFieldGroup}
              newFieldLabel={newFieldLabel}
              setNewFieldLabel={setNewFieldLabel}
              newFieldType={newFieldType}
              setNewFieldType={setNewFieldType}
              newFieldOptionLabels={newFieldOptionLabels}
              setNewFieldOptionLabels={setNewFieldOptionLabels}

              setCustomFieldsError={setCustomFieldsError}
              refetchCustomFields={refetchCustomFields}

              editingFieldId={editingFieldId}
              setEditingFieldId={setEditingFieldId}
              editingLabel={editingLabel}
              setEditingLabel={setEditingLabel}
              editingGroup={editingGroup}
              setEditingGroup={setEditingGroup}
              editingDescription={editingDescription}
              setEditingDescription={setEditingDescription}

              customFieldTypeLabels={CUSTOM_FIELD_TYPE_LABELS}
            />
          </Section>
        )}
      </TabsContent>

      <TabsContent value="statuses" className="mt-4">
        {activeTab === "statuses" && (
          <Section title="Статусы клиентов">
            <ClientStatusesTabPanel
              clientStatuses={clientStatuses}
              clientStatusesLoading={clientStatusesLoading}
              STATUS_COLOR_PRESETS={STATUS_COLOR_PRESETS}

              addStatusDialogOpen={addStatusDialogOpen}
              setAddStatusDialogOpen={setAddStatusDialogOpen}
              newStatusLabel={newStatusLabel}
              setNewStatusLabel={setNewStatusLabel}
              newStatusColor={newStatusColor}
              setNewStatusColor={setNewStatusColor}

              editingStatusId={editingStatusId}
              setEditingStatusId={setEditingStatusId}
              editingStatusLabel={editingStatusLabel}
              setEditingStatusLabel={setEditingStatusLabel}
              editingStatusColor={editingStatusColor}
              setEditingStatusColor={setEditingStatusColor}

              refetchClientStatuses={refetchClientStatuses}
            />
          </Section>
        )}
      </TabsContent>

      {schedulingEnabled && (
        <TabsContent value="calendar" className="mt-4">
          {activeTab === "calendar" && (
            <Section title="Подписка на календарь">
              <CalendarSubscriptionBlock />
            </Section>
          )}
        </TabsContent>
      )}

      <TabsContent value="professional" className="mt-4">
        {activeTab === "professional" && (
        <Section title="Профессиональный профиль">
          <ProfessionalTabPanel
            schedulingEnabled={schedulingEnabled}
            profilePhotoUrl={profile.psychologistProfile?.profilePhotoUrl ?? null}
            profilePhotoPublished={profilePhotoPublished}
            initials={initials}
            alt={name || "Психолог"}
            publishSaving={savingPublish}
            onPublishChange={handlePublishProfileChange}
            onSuccess={() => void refetchProfile()}

            handleSaveProfessional={handleSaveProfessional}
            savingProfessional={savingProfessional}
            hasProfessionalChanges={hasProfessionalChanges}

            bio={bio}
            setBio={setBio}
            BIO_MAX_LENGTH={BIO_MAX_LENGTH}

            specialization={specialization}
            setSpecialization={setSpecialization}
            PROFESSION_OPTIONS={PROFESSION_OPTIONS}

            contactPhone={contactPhone}
            setContactPhone={setContactPhone}
            contactTelegram={contactTelegram}
            setContactTelegram={setContactTelegram}
            contactViber={contactViber}
            setContactViber={setContactViber}
            contactWhatsapp={contactWhatsapp}
            setContactWhatsapp={setContactWhatsapp}
          />
        </Section>
        )}
      </TabsContent>
    </Tabs>
    </SettingsFormErrorBoundary>
  );
}
