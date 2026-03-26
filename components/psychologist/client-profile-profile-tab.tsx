"use client";

import type { Dispatch, SetStateAction } from "react";

import { ru } from "date-fns/locale";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CountryAutocomplete, CityAutocomplete } from "@/components/ui/location-autocomplete";
import { cn } from "@/lib/utils";
import { shouldCloseCalendarPopoverAfterSelect } from "@/lib/close-calendar-popover";

const FIELD_ROW_CLASS = "flex flex-col gap-1 py-3 border-b border-border last:border-b-0 md:flex-row md:items-center md:gap-4";
const FIELD_LABEL_CLASS = "text-sm text-muted-foreground shrink-0 w-full md:w-[200px]";
const FIELD_VALUE_CLASS = "min-w-0 w-full md:min-w-[28rem] md:w-fit";
const PLAIN_INPUT_CLASS =
  "border-0 bg-transparent shadow-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 h-auto py-0 min-h-0 w-full min-w-0 md:w-auto md:min-w-[28rem]";

const MARITAL_OPTIONS: { value: string; label: string }[] = [
  { value: "single", label: "Не в браке" },
  { value: "married", label: "В браке" },
  { value: "divorced", label: "В разводе" },
  { value: "widowed", label: "Вдовец / Вдова" },
  { value: "unspecified", label: "Не указано" }
];

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU");
}

type Props = {
  email: string | null;
  createdAt: string;

  hasAccount: boolean;
  isEditing: boolean;
  saving: boolean;
  deleting: boolean;
  customFieldsSaving: boolean;

  error: string | null;

  firstName: string;
  setFirstName: Dispatch<SetStateAction<string>>;
  lastName: string;
  setLastName: Dispatch<SetStateAction<string>>;

  emailValue: string;
  setEmailValue: Dispatch<SetStateAction<string>>;

  phone: string;
  setPhone: Dispatch<SetStateAction<string>>;
  phoneHref: string | null;
  phoneDisplayText: string;

  country: string;
  setCountry: Dispatch<SetStateAction<string>>;
  countryCode: string | null;
  setCountryCode: Dispatch<SetStateAction<string | null>>;
  city: string;
  setCity: Dispatch<SetStateAction<string>>;

  gender: string;
  setGender: Dispatch<SetStateAction<string>>;
  maritalStatus: string;
  setMaritalStatus: Dispatch<SetStateAction<string>>;

  notes: string;
  setNotes: Dispatch<SetStateAction<string>>;

  dob: Date | undefined;
  dobPopoverOpen: boolean;
  setDobPopoverOpen: Dispatch<SetStateAction<boolean>>;
  setDob: Dispatch<SetStateAction<Date | undefined>>;

  handleSendRegistrationInvite: () => Promise<void>;
  cancelAll: () => void;
  saveAll: () => Promise<void>;
};

export function ClientProfileProfileTab({
  email,
  createdAt,

  hasAccount,
  isEditing,
  saving,
  deleting,
  customFieldsSaving,

  error,

  firstName,
  setFirstName,
  lastName,
  setLastName,

  emailValue,
  setEmailValue,

  phone,
  setPhone,
  phoneHref,
  phoneDisplayText,

  country,
  setCountry,
  countryCode,
  setCountryCode,
  city,
  setCity,

  gender,
  setGender,
  maritalStatus,
  setMaritalStatus,

  notes,
  setNotes,

  dob,
  dobPopoverOpen,
  setDobPopoverOpen,
  setDob,

  handleSendRegistrationInvite,
  cancelAll,
  saveAll
}: Props) {
  return (
    <>
      <div className="text-sm text-muted-foreground pb-2">
        {email ?? "Email ещё не указан"} · Создан {formatDate(createdAt)}
      </div>

      <form
        id="profile-form"
        onSubmit={(e) => {
          e.preventDefault();
          void saveAll();
        }}
        className="flex min-w-0 flex-col"
      >
        <div className={FIELD_ROW_CLASS}>
          <Label htmlFor="firstName" className={FIELD_LABEL_CLASS}>
            Имя
          </Label>
          <div className={FIELD_VALUE_CLASS}>
            <Input
              id="firstName"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={!isEditing}
              className={cn(PLAIN_INPUT_CLASS, !isEditing && "cursor-default")}
            />
          </div>
        </div>

        <div className={FIELD_ROW_CLASS}>
          <Label htmlFor="lastName" className={FIELD_LABEL_CLASS}>
            Фамилия
          </Label>
          <div className={FIELD_VALUE_CLASS}>
            <Input
              id="lastName"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={!isEditing}
              className={cn(PLAIN_INPUT_CLASS, !isEditing && "cursor-default")}
            />
          </div>
        </div>

        <div className={FIELD_ROW_CLASS}>
          <Label htmlFor="profile-email" className={FIELD_LABEL_CLASS}>
            Email
            {hasAccount && (
              <span className="ml-1 font-normal text-muted-foreground">(из аккаунта)</span>
            )}
          </Label>

          <div className={cn(FIELD_VALUE_CLASS, "relative flex items-center")}>
            <Input
              id="profile-email"
              type="email"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              disabled={!isEditing || hasAccount}
              placeholder={hasAccount ? undefined : "Для связки при регистрации"}
              className={cn(PLAIN_INPUT_CLASS, "pr-8", (!isEditing || hasAccount) && "cursor-default")}
            />

            {!hasAccount && emailValue.trim() && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => void handleSendRegistrationInvite()}
                      className="absolute right-0 flex items-center text-muted-foreground hover:text-foreground"
                      aria-label="Отправить приглашение зарегистрироваться"
                    >
                      <Mail className="h-4 w-4" aria-hidden />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Отправить приглашение зарегистрироваться</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        <div className={FIELD_ROW_CLASS}>
          <Label className={FIELD_LABEL_CLASS}>Дата рождения</Label>
          <div className={FIELD_VALUE_CLASS}>
            <Popover open={dobPopoverOpen} onOpenChange={setDobPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  type="button"
                  className={cn(
                    "w-auto justify-start text-left font-normal h-auto py-0 min-h-0 text-foreground hover:bg-transparent disabled:opacity-100",
                    !isEditing && "cursor-default"
                  )}
                  disabled={!isEditing}
                >
                  {dob ? (
                    dob.toLocaleDateString("ru-RU")
                  ) : (
                    <span className="text-muted-foreground">дд.мм.гггг</span>
                  )}
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-auto border-none bg-transparent p-0 shadow-none" align="start">
                <Calendar
                  mode="single"
                  selected={dob}
                  onSelect={(d) => {
                    setDob(d);
                    if (shouldCloseCalendarPopoverAfterSelect()) setDobPopoverOpen(false);
                  }}
                  locale={ru}
                  initialFocus
                  defaultMonth={dob ?? new Date()}
                  captionLayout="dropdown"
                  startMonth={new Date(1920, 0)}
                  endMonth={new Date()}
                  reverseYears
                  hideNavigation
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className={FIELD_ROW_CLASS}>
          <Label htmlFor="phone" className={FIELD_LABEL_CLASS}>
            Телефон
          </Label>
          <div className={FIELD_VALUE_CLASS}>
            {isEditing ? (
              <PhoneInput
                id="phone"
                value={phone}
                onChange={(value) => setPhone(value)}
                className={PLAIN_INPUT_CLASS}
              />
            ) : phoneHref && phoneDisplayText !== "—" ? (
              <a
                id="phone"
                href={phoneHref}
                className={cn(
                  PLAIN_INPUT_CLASS,
                  "text-primary underline-offset-2 hover:underline inline-block"
                )}
              >
                {phoneDisplayText}
              </a>
            ) : (
              <span id="phone" className={cn(PLAIN_INPUT_CLASS, "text-muted-foreground inline-block")}>
                {phoneDisplayText}
              </span>
            )}
          </div>
        </div>

        <div className={FIELD_ROW_CLASS}>
          <Label htmlFor="client-country" className={FIELD_LABEL_CLASS}>
            Страна
          </Label>
          <div className={FIELD_VALUE_CLASS}>
            <CountryAutocomplete
              id="client-country"
              value={country}
              onChange={(name, code) => {
                setCountry(name);
                setCountryCode(code || null);
                if (!name) setCity("");
              }}
              placeholder="Начните вводить страну"
              disabled={!isEditing}
              className={PLAIN_INPUT_CLASS}
            />
          </div>
        </div>

        <div className={FIELD_ROW_CLASS}>
          <Label htmlFor="client-city" className={FIELD_LABEL_CLASS}>
            Город
          </Label>
          <div className={FIELD_VALUE_CLASS}>
            <CityAutocomplete
              id="client-city"
              value={city}
              onChange={setCity}
              countryCode={countryCode}
              placeholder="Начните вводить город"
              disabled={!isEditing}
              className={PLAIN_INPUT_CLASS}
            />
          </div>
        </div>

        <div className={FIELD_ROW_CLASS}>
          <Label className={FIELD_LABEL_CLASS} htmlFor="client-gender-select">
            Пол
          </Label>
          <div className={FIELD_VALUE_CLASS}>
            <Select
              value={gender || "unspecified"}
              onValueChange={(value) => setGender(value === "unspecified" ? "" : value)}
              disabled={!isEditing}
            >
              <SelectTrigger
                id="client-gender-select"
                className={cn("border-0 bg-transparent shadow-none h-auto py-0 min-h-0 w-auto", !isEditing && "cursor-default")}
              >
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

        <div className={FIELD_ROW_CLASS}>
          <Label htmlFor="client-marital" className={FIELD_LABEL_CLASS}>
            Семейное положение
          </Label>
          <div className={FIELD_VALUE_CLASS}>
            <Select
              value={maritalStatus || "unspecified"}
              onValueChange={setMaritalStatus}
              disabled={!isEditing}
            >
              <SelectTrigger
                id="client-marital"
                className={cn(
                  "border-0 bg-transparent shadow-none h-auto py-0 min-h-0 w-auto",
                  !isEditing && "cursor-default"
                )}
              >
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

        <div className={FIELD_ROW_CLASS}>
          <Label htmlFor="notes" className={FIELD_LABEL_CLASS}>
            Заметки
          </Label>
          <div className={FIELD_VALUE_CLASS}>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!isEditing}
              className={cn(PLAIN_INPUT_CLASS, "resize-none", !isEditing && "cursor-default")}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground mt-2">
            {error}
          </div>
        )}

        {isEditing && (
          <div className="flex flex-wrap items-center justify-end gap-2 pt-4 mt-2">
            <Button type="button" variant="outline" size="sm" onClick={cancelAll}>
              Отменить
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving || deleting || customFieldsSaving}
              onClick={() => void saveAll()}
            >
              {saving || customFieldsSaving ? "Сохраняем…" : "Сохранить"}
            </Button>
          </div>
        )}
      </form>
    </>
  );
}

