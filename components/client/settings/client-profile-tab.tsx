"use client";

import { useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import type { UseMutationResult } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarUploadBlock } from "@/components/account/avatar-upload-block";
import { PhoneInput } from "@/components/ui/phone-input";
import { CountryAutocomplete, CityAutocomplete } from "@/components/ui/location-autocomplete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getCountryCodeByName } from "@/lib/data/countries-ru";
import { shouldCloseCalendarPopoverAfterSelect } from "@/lib/close-calendar-popover";
import {
  type ClientSettingsProfile,
  type PatchClientProfileBody
} from "@/hooks/use-client-settings";
import { SettingsSection } from "./settings-section";

const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((m) => ({ default: m.Calendar })),
  { ssr: false }
);

const MARITAL_OPTIONS: { value: string; label: string }[] = [
  { value: "single", label: "Не в браке" },
  { value: "married", label: "В браке" },
  { value: "divorced", label: "В разводе" },
  { value: "widowed", label: "Вдовец / Вдова" },
  { value: "unspecified", label: "Не указано" }
];

export function ClientProfileTab({
  profile,
  updateProfile
}: {
  profile: ClientSettingsProfile;
  updateProfile: UseMutationResult<void, Error, PatchClientProfileBody>;
}) {
  const { data: session, update: updateSession } = useSession();
  const [firstName, setFirstName] = useState(() => {
    const parts = (profile.user.name ?? "").trim().split(/\s+/).filter(Boolean);
    return parts[0] ?? "";
  });
  const [lastName, setLastName] = useState(() => {
    const parts = (profile.user.name ?? "").trim().split(/\s+/).filter(Boolean);
    return parts.slice(1).join(" ") ?? "";
  });
  const [email, setEmail] = useState(() => profile.user.email ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(() => profile.user.dateOfBirth ?? "");
  const [dobPopoverOpen, setDobPopoverOpen] = useState(false);
  const [phone, setPhone] = useState(() => profile.user.phone ?? "");
  const [country, setCountry] = useState(() => profile.user.country ?? "");
  const [city, setCity] = useState(() => profile.user.city ?? "");
  const [countryCode, setCountryCode] = useState<string | null>(() =>
    profile.user.country ? getCountryCodeByName(profile.user.country) : null
  );
  const [gender, setGender] = useState(() => profile.user.gender ?? "");
  const [maritalStatus, setMaritalStatus] = useState(() => profile.user.maritalStatus ?? "");

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync({
        name: [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim() || null,
        ...(email.trim() &&
        email.trim().toLowerCase() !== (profile.user.email ?? "").trim().toLowerCase()
          ? { email: email.trim() }
          : {}),
        dateOfBirth: dateOfBirth || null,
        phone: phone.trim() || null,
        country: country.trim() || null,
        city: city.trim() || null,
        gender: gender || null,
        maritalStatus: maritalStatus || null
      });
    } catch {
      /* toast в useClientSettings */
    }
  }

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const displayName = session?.user?.name ?? fullName ?? "";
  const displayEmail = (email || profile.user.email) ?? "";
  const image = session?.user?.image ?? profile.user.image ?? null;
  const initials =
    (fullName || displayName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((s) => s[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || displayEmail.slice(0, 2).toUpperCase() || "?";

  const savedName = (profile.user.name ?? "").trim();
  const hasProfileChanges =
    fullName !== savedName ||
    email.trim().toLowerCase() !== profile.user.email.trim().toLowerCase() ||
    (dateOfBirth || "") !== (profile.user.dateOfBirth ?? "") ||
    (phone.trim() || "") !== (profile.user.phone ?? "").trim() ||
    (country.trim() || "") !== (profile.user.country ?? "").trim() ||
    (city.trim() || "") !== (profile.user.city ?? "").trim() ||
    (gender || "") !== (profile.user.gender ?? "") ||
    (maritalStatus || "") !== (profile.user.maritalStatus ?? "");

  return (
    <SettingsSection title="Личные данные">
      <form onSubmit={handleSaveProfile} className="space-y-5 max-w-2xl">
        <AvatarUploadBlock
          image={image}
          initials={initials}
          alt={displayName}
          onSuccess={() => updateSession?.()}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="client-firstName">Имя</Label>
            <Input
              id="client-firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Имя"
              autoComplete="given-name"
              maxLength={32}
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
              maxLength={32}
            />
          </div>
        </div>

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
            <Label htmlFor="client-settings-phone">Телефон</Label>
            <PhoneInput id="client-settings-phone" value={phone} onChange={setPhone} />
          </div>
        </div>

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
                  onSelect={(d) => {
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
            <Label htmlFor="client-gender">Пол</Label>
            <Select
              value={gender || "unspecified"}
              onValueChange={(value) => setGender(value === "unspecified" ? "" : value)}
            >
              <SelectTrigger id="client-gender">
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

        <div className="grid gap-4 sm:grid-cols-3">
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
              placeholder="Страна"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-settings-city">Город</Label>
            <CityAutocomplete
              id="client-settings-city"
              value={city}
              onChange={setCity}
              countryCode={countryCode}
              placeholder="Город"
            />
          </div>
          <div className="space-y-2">
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
        </div>

        <Button type="submit" disabled={updateProfile.isPending || !hasProfileChanges}>
          {updateProfile.isPending ? "Сохранение…" : "Сохранить"}
        </Button>
      </form>
    </SettingsSection>
  );
}
