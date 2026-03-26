"use client";

import React, { Component, useEffect, useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";
import { shouldCloseCalendarPopoverAfterSelect } from "@/lib/close-calendar-popover";
import { Calendar as CalendarIcon, User, Lock, Link2, CalendarDays, Briefcase, ListChecks, ListFilter, Pencil, Trash2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
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
import { useProfileSettings } from "@/hooks/use-profile-settings";
import { useCustomFieldsSettings } from "@/hooks/use-custom-fields-settings";
import { useClientStatusesSettings } from "@/hooks/use-client-statuses-settings";
import { SecurityTabForm } from "@/components/psychologist/settings/security-tab";
import { AccountsTabContent } from "@/components/psychologist/settings/accounts-tab";
import { CustomFieldsFieldsPanel } from "@/components/psychologist/settings/custom-fields-fields-panel";
import { CustomFieldsTabsPanel } from "@/components/psychologist/settings/custom-fields-tabs-panel";

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
  const [customFieldsError, setCustomFieldsError] = useState<string | null>(null);
  const effectiveCustomFieldsError = customFieldsError ?? customFieldsQueryError;
  const [newTabName, setNewTabName] = useState("");
  const [newTabDescription, setNewTabDescription] = useState("");
  const [editingTabGroup, setEditingTabGroup] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState("");
  const [editingTabDescription, setEditingTabDescription] = useState("");
  const [localTabs, setLocalTabs] = useState<{ name: string; description: string }[]>([]);
  const [createTabDialogOpen, setCreateTabDialogOpen] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldGroup, setNewFieldGroup] = useState("");
  const [newFieldType, setNewFieldType] = useState<"TEXT" | "MULTILINE" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT" | "MULTI_SELECT">("TEXT");
  const [newFieldOptionLabels, setNewFieldOptionLabels] = useState<string[]>([]);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [editingGroup, setEditingGroup] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
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

  const existingGroups = useMemo(
    () => {
      const map = new Map<string, { description: string; count: number }>();
      for (const f of customFields) {
        const raw =
          f.group && typeof f.group === "string" ? String(f.group).trim() : "";
        if (!raw) continue;
        const entry = map.get(raw) ?? { description: "", count: 0 };
        entry.count += 1;
        if (!entry.description && typeof f.description === "string") {
          const desc = f.description.trim();
          if (desc) entry.description = desc;
        }
        map.set(raw, entry);
      }
      return Array.from(map.entries()).map(([name, meta]) => ({
        name,
        description: meta.description,
        count: meta.count
      }));
    },
    [customFields]
  );

  const availableTabs = useMemo(
    () => {
      const fromFields = existingGroups.map((g) => ({
        name: g.name,
        description: g.description
      }));
      const extras = localTabs.filter(
        (t) => !fromFields.some((g) => g.name === t.name)
      );
      return [...fromFields, ...extras];
    },
    [existingGroups, localTabs]
  );

  const allTabsForList = useMemo(
    () =>
      availableTabs.map((t) => {
        const fromExisting = existingGroups.find((g) => g.name === t.name);
        return {
          name: t.name,
          description: t.description,
          count: fromExisting?.count ?? 0
        };
      }),
    [availableTabs, existingGroups]
  );

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
            <div className="space-y-4">
              {effectiveCustomFieldsError && (
                <div className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                  {effectiveCustomFieldsError}
                </div>
              )}
              <CustomFieldsTabsPanel
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
                customFields={customFields}
                refetchCustomFields={refetchCustomFields}
                setCustomFieldsError={setCustomFieldsError}
              />

              <CustomFieldsFieldsPanel
                availableTabs={availableTabs}
                customFieldsLoading={customFieldsLoading}
                customFields={customFields}
                newFieldGroup={newFieldGroup}
                setNewFieldGroup={setNewFieldGroup}
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
            </div>
          </Section>
        )}
      </TabsContent>

      <TabsContent value="statuses" className="mt-4">
        {activeTab === "statuses" && (
          <Section title="Статусы клиентов">
            <p className="text-sm text-muted-foreground mb-4">
              Настраиваемые статусы для карточек клиентов (Новый, Активный, Пауза, Архив и др.). Отображаются в списке и в профиле клиента.
            </p>
            {clientStatusesLoading ? (
              <p className="text-sm text-muted-foreground">Загрузка...</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Список статусов</p>
                  <Dialog open={addStatusDialogOpen} onOpenChange={setAddStatusDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">Добавить статус</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Новый статус</DialogTitle>
                        <DialogDescription>Укажите название и цвет статуса.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label htmlFor="new-status-label">Название</Label>
                          <Input
                            id="new-status-label"
                            placeholder="Например, Активный"
                            value={newStatusLabel}
                            maxLength={16}
                            onChange={(e) => setNewStatusLabel(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Цвет</Label>
                          <p className="text-xs text-muted-foreground">
                            Выберите один из предустановленных контрастных цветов.
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {STATUS_COLOR_PRESETS.map((c) => {
                              const selected = newStatusColor === c.value;
                              return (
                                <button
                                  key={c.value}
                                  type="button"
                                  onClick={() => setNewStatusColor(c.value)}
                                  className={cn(
                                    "flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-xs",
                                    selected
                                      ? "ring-2 ring-primary border-primary"
                                      : "border-border bg-background hover:bg-muted/60"
                                  )}
                                >
                                  <span
                                    className="inline-block h-6 w-10 rounded"
                                    style={{ backgroundColor: c.value }}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          onClick={async () => {
                            const label = newStatusLabel.trim();
                            if (!label) return;
                            try {
                              const res = await fetch("/api/psychologist/client-statuses", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ label, color: newStatusColor || STATUS_COLOR_PRESETS[0]?.value || "hsl(217 91% 60%)" })
                              });
                              const data = await res.json().catch(() => ({}));
                              if (!res.ok) {
                                toast.error(data.message ?? "Не удалось добавить статус");
                                return;
                              }
                              setNewStatusLabel("");
                              setNewStatusColor(STATUS_COLOR_PRESETS[0]?.value ?? "hsl(217 91% 60%)");
                              setAddStatusDialogOpen(false);
                              refetchClientStatuses();
                              toast.success("Статус добавлен");
                            } catch (err) {
                              console.error(err);
                              toast.error("Не удалось добавить статус");
                            }
                          }}
                        >
                          Добавить
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                {clientStatuses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет статусов. Добавьте первый или используйте стандартные (появятся при открытии списка клиентов).</p>
                ) : (
                  <div className="rounded-lg border divide-y">
                    <div className="grid grid-cols-[1fr,120px,auto] gap-2 border-b bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
                      <span>Название</span>
                      <span>Цвет</span>
                      <span className="text-right">Действия</span>
                    </div>
                    {clientStatuses.map((s) => (
                      <div key={s.id} className="grid grid-cols-[1fr,120px,auto] gap-2 items-center px-3 py-2">
                        {editingStatusId === s.id ? (
                          <>
                            <Input
                              value={editingStatusLabel}
                              onChange={(e) => setEditingStatusLabel(e.target.value)}
                              className="h-8"
                              maxLength={16}
                            />
                            <div className="grid grid-cols-3 gap-1">
                              {STATUS_COLOR_PRESETS.map((c) => {
                                const selected = (editingStatusColor || s.color) === c.value;
                                return (
                                  <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setEditingStatusColor(c.value)}
                                    className={cn(
                                      "flex flex-col items-center gap-0.5 rounded-md border px-1.5 py-1",
                                      selected
                                        ? "ring-2 ring-primary border-primary"
                                        : "border-border bg-background hover:bg-muted/60"
                                    )}
                                  >
                                    <span
                                      className="inline-block h-4 w-8 rounded"
                                      style={{ backgroundColor: c.value }}
                                    />
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingStatusId(null);
                                  setEditingStatusLabel("");
                                  setEditingStatusColor("");
                                }}
                              >
                                Отмена
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const res = await fetch("/api/psychologist/client-statuses", {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        id: s.id,
                                        label: editingStatusLabel.trim() || s.label,
                                        color: editingStatusColor.trim() || s.color
                                      })
                                    });
                                    const data = await res.json().catch(() => ({}));
                                    if (!res.ok) {
                                      toast.error(data.message ?? "Не удалось сохранить");
                                      return;
                                    }
                                    setEditingStatusId(null);
                                    setEditingStatusLabel("");
                                    setEditingStatusColor("");
                                    refetchClientStatuses();
                                    toast.success("Статус сохранён");
                                  } catch (err) {
                                    console.error(err);
                                    toast.error("Не удалось сохранить");
                                  }
                                }}
                              >
                                Сохранить
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-sm">{s.label}</span>
                            <span
                              className="inline-block h-6 w-6 rounded border shrink-0"
                              style={{ backgroundColor: s.color }}
                            />
                            <div className="flex items-center justify-end gap-1 min-w-[4.5rem]">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditingStatusId(s.id);
                                  setEditingStatusLabel(s.label);
                                  setEditingStatusColor(s.color);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {s.key === "NEW" ? (
                                <span className="h-8 w-8 shrink-0" aria-hidden />
                              ) : (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch("/api/psychologist/client-statuses", {
                                        method: "DELETE",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ id: s.id })
                                      });
                                      if (!res.ok) {
                                        const data = await res.json().catch(() => ({}));
                                        toast.error(data.message ?? "Не удалось удалить");
                                        return;
                                      }
                                      refetchClientStatuses();
                                      toast.success("Статус удалён");
                                    } catch (err) {
                                      console.error(err);
                                      toast.error("Не удалось удалить");
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
          <div className="max-w-2xl">
          <ProfilePhotoUploadBlock
            profilePhotoUrl={profile.psychologistProfile?.profilePhotoUrl ?? null}
            profilePhotoPublished={profilePhotoPublished}
            schedulingEnabled={schedulingEnabled}
            initials={initials}
            alt={name || "Психолог"}
            onSuccess={() => void refetchProfile()}
            onPublishChange={handlePublishProfileChange}
            publishSaving={savingPublish}
          />
          </div>
          <form onSubmit={handleSaveProfessional} className="space-y-5 max-w-2xl">

            {/* О себе */}
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

            {/* Профессия */}
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
                    <Label htmlFor={`prof-${opt.value}`} className="font-normal cursor-pointer">
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Контакты для клиентов */}
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Контакты для клиентов</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Будут видны клиентам в вашем профиле
                </p>
              </div>

              {/* Телефон и Telegram */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-phone" className="flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" width="15" height="15" className="shrink-0" aria-hidden>
                      <path fill="#16a34a" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.21z"/>
                    </svg>
                    Телефон
                  </Label>
                  <Input
                    id="contact-phone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+375 (29) 123-45-67"
                    maxLength={32}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-telegram" className="flex items-center gap-1.5">
                    {/* Telegram */}
                    <svg viewBox="0 0 24 24" width="15" height="15" className="shrink-0" aria-hidden>
                      <path fill="#229ED9" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0z"/>
                      <path fill="#FFFFFF" d="M16.906 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                    Telegram
                  </Label>
                  <Input
                    id="contact-telegram"
                    value={contactTelegram}
                    onChange={(e) => setContactTelegram(e.target.value)}
                    placeholder="@username или ссылка"
                    maxLength={128}
                  />
                </div>
              </div>

              {/* Viber и WhatsApp */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-viber" className="flex items-center gap-1.5">
                    {/* Viber */}
                    <svg viewBox="0 0 24 24" width="15" height="15" className="shrink-0" aria-hidden>
                      <path fill="#7360f2" d="M11.4 0C9.473.028 5.333.344 3.02 2.467 1.302 4.187.696 6.7.633 9.817.57 12.933.488 18.776 6.12 20.36h.003l-.004 2.416s-.037.977.61 1.177c.777.242 1.234-.5 1.98-1.302.407-.44.972-1.084 1.397-1.58 3.85.326 6.812-.416 7.15-.525.776-.252 5.176-.816 5.892-6.657.74-6.02-.36-9.83-2.34-11.546-.596-.55-3.006-2.3-8.375-2.323 0 0-.395-.025-1.037-.017zm.058 1.693c.545-.004.88.017.88.017 4.542.02 6.717 1.388 7.222 1.846 1.675 1.435 2.53 4.868 1.906 9.897v.002c-.604 4.878-4.174 5.184-4.832 5.395-.28.09-2.882.737-6.153.524 0 0-2.436 2.94-3.197 3.704-.12.12-.26.167-.352.144-.13-.033-.166-.188-.165-.414l.02-4.018c-4.762-1.32-4.485-6.292-4.43-8.895.054-2.604.543-4.738 1.996-6.173 1.96-1.773 5.474-2.018 7.11-2.03zm.38 2.602c-.167 0-.303.135-.304.302 0 .167.133.303.3.305 1.624.01 2.946.537 4.028 1.592 1.073 1.046 1.62 2.468 1.633 4.334.002.167.14.3.307.3.166-.002.3-.138.3-.304-.014-1.984-.618-3.596-1.816-4.764-1.19-1.16-2.692-1.753-4.447-1.765zm-3.96.695c-.19-.032-.4.005-.616.117l-.01.002c-.43.247-.816.562-1.146.932-.002.004-.006.004-.008.008-.267.323-.42.638-.46.948-.008.046-.01.093-.007.14 0 .136.022.27.065.4l.013.01c.135.48.473 1.276 1.205 2.604.42.768.903 1.5 1.446 2.186.27.344.56.673.87.984l.132.132c.31.308.64.6.984.87.686.543 1.418 1.027 2.186 1.447 1.328.733 2.126 1.07 2.604 1.206l.01.014c.13.042.265.064.402.063.046.002.092 0 .138-.008.31-.036.627-.19.948-.46.004 0 .003-.002.008-.005.37-.33.683-.72.93-1.148l.003-.01c.225-.432.15-.842-.18-1.12-.004 0-.698-.58-1.037-.83-.36-.255-.73-.492-1.113-.71-.51-.285-1.032-.106-1.248.174l-.447.564c-.23.283-.657.246-.657.246-3.12-.796-3.955-3.955-3.955-3.955s-.037-.426.248-.656l.563-.448c.277-.215.456-.737.17-1.248-.217-.383-.454-.756-.71-1.115-.25-.34-.826-1.033-.83-1.035-.137-.165-.31-.265-.502-.297zm4.49.88c-.158.002-.29.124-.3.282-.01.167.115.312.282.324 1.16.085 2.017.466 2.645 1.15.63.688.93 1.524.906 2.57-.002.168.13.306.3.31.166.003.305-.13.31-.297.025-1.175-.334-2.193-1.067-2.994-.74-.81-1.777-1.253-3.05-1.346h-.024zm.463 1.63c-.16.002-.29.127-.3.287-.008.167.12.31.288.32.523.028.875.175 1.113.422.24.245.388.62.416 1.164.01.167.15.295.318.287.167-.008.295-.15.287-.317-.03-.644-.215-1.178-.58-1.557-.367-.378-.893-.574-1.52-.607h-.018z"/>
                    </svg>
                    Viber
                  </Label>
                  <Input
                    id="contact-viber"
                    value={contactViber}
                    onChange={(e) => setContactViber(e.target.value)}
                    placeholder="Номер или ссылка"
                    maxLength={128}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-whatsapp" className="flex items-center gap-1.5">
                    {/* WhatsApp */}
                    <svg viewBox="0 0 24 24" width="15" height="15" className="shrink-0" aria-hidden>
                      <path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    WhatsApp
                  </Label>
                  <Input
                    id="contact-whatsapp"
                    value={contactWhatsapp}
                    onChange={(e) => setContactWhatsapp(e.target.value)}
                    placeholder="Номер или ссылка"
                    maxLength={128}
                  />
                </div>
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
