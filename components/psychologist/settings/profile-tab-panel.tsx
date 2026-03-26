"use client";

import dynamic from "next/dynamic";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { Dispatch, FC, SetStateAction } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import React from "react";

import { shouldCloseCalendarPopoverAfterSelect } from "@/lib/close-calendar-popover";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { AvatarUploadBlock } from "@/components/account/avatar-upload-block";

const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((m) => ({ default: m.Calendar })),
  { ssr: false }
);

const CountryAutocomplete = dynamic(
  () => import("@/components/ui/location-autocomplete").then((m) => ({ default: m.CountryAutocomplete })),
  { ssr: false }
);

const CityAutocomplete = dynamic(
  () => import("@/components/ui/location-autocomplete").then((m) => ({ default: m.CityAutocomplete })),
  { ssr: false }
);

export type MaritalOption = { value: string; label: string };

type Props = {
  handleSaveProfile: (e: React.FormEvent) => Promise<void>;
  saving: boolean;
  hasProfileChanges: boolean;

  image: string | null;
  initials: string;
  alt: string;
  onAvatarSuccess: () => void;

  firstName: string;
  setFirstName: Dispatch<SetStateAction<string>>;
  lastName: string;
  setLastName: Dispatch<SetStateAction<string>>;
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  phone: string;
  setPhone: Dispatch<SetStateAction<string>>;

  dateOfBirth: string;
  dobPopoverOpen: boolean;
  setDobPopoverOpen: Dispatch<SetStateAction<boolean>>;
  setDateOfBirth: Dispatch<SetStateAction<string>>;

  gender: string;
  setGender: Dispatch<SetStateAction<string>>;

  country: string;
  setCountry: Dispatch<SetStateAction<string>>;
  countryCode: string | null;
  setCountryCode: Dispatch<SetStateAction<string | null>>;
  city: string;
  setCity: Dispatch<SetStateAction<string>>;

  maritalStatus: string;
  setMaritalStatus: Dispatch<SetStateAction<string>>;

  maritalOptions: MaritalOption[];
};

export const ProfileTabPanel: FC<Props> = ({
  handleSaveProfile,
  saving,
  hasProfileChanges,

  image,
  initials,
  alt,
  onAvatarSuccess,

  firstName,
  setFirstName,
  lastName,
  setLastName,
  email,
  setEmail,
  phone,
  setPhone,

  dateOfBirth,
  dobPopoverOpen,
  setDobPopoverOpen,
  setDateOfBirth,

  gender,
  setGender,

  country,
  setCountry,
  countryCode,
  setCountryCode,
  city,
  setCity,

  maritalStatus,
  setMaritalStatus,

  maritalOptions
}) => {
  return (
    <form onSubmit={handleSaveProfile} className="space-y-5 max-w-2xl">
        <AvatarUploadBlock
          image={image}
          initials={initials}
          alt={alt}
          onSuccess={() => onAvatarSuccess()}
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
            <Select
              value={maritalStatus || "unspecified"}
              onValueChange={setMaritalStatus}
            >
              <SelectTrigger id="marital">
                <SelectValue placeholder="Выберите" />
              </SelectTrigger>
              <SelectContent>
                {maritalOptions.map((opt) => (
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
  );
};

