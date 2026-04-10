"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Search, X } from "lucide-react";

import type { PsychologistCatalogEntry } from "@/lib/psychologists-catalog";
import { psychologistPublicProfilePath } from "@/lib/psychologist-public-profile-path";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

/** Значение «без фильтра» в Select (не должно совпадать с названием города/страны). */
const FILTER_ANY = "__crm_filter_any__";

const PROFESSION_LABELS: Record<string, string> = {
  psychologist: "Психолог",
  psychotherapist: "Врач-психотерапевт",
  psychiatrist: "Психиатр"
};

function getProfessionLabel(specialization: string | null | undefined): string {
  if (!specialization?.trim()) return "Специалист";
  return PROFESSION_LABELS[specialization.trim()] ?? "Специалист";
}

function normalize(s: string | null | undefined): string {
  return (s ?? "").trim();
}

function matchesSearchTokens(p: PsychologistCatalogEntry, q: string): boolean {
  const trimmed = q.trim().toLowerCase();
  if (!trimmed) return true;
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const hay = [
    p.firstName,
    p.lastName,
    `${p.firstName} ${p.lastName}`,
    p.practiceCountry,
    p.practiceCity,
    p.publicSlug,
    `id${p.publicRouteSerial}`,
    p.bio ?? "",
    p.worksOnline ? "онлайн" : ""
  ]
    .map((x) => String(x ?? "").toLowerCase())
    .join(" \n ");
  return tokens.every((t) => hay.includes(t));
}

function catalogLocationLine(p: PsychologistCatalogEntry): string | null {
  const city = normalize(p.practiceCity);
  const country = normalize(p.practiceCountry);
  const place = [city, country].filter(Boolean).join(", ");
  if (p.worksOnline && place) return `Онлайн · ${place}`;
  if (p.worksOnline) return "Онлайн";
  if (place) return place;
  return null;
}

export function PublicPsychologistsList({
  schedulingEnabled = true,
  initialPsychologists
}: {
  schedulingEnabled?: boolean;
  /** С сервера (SSR) — без «мигания» и лишнего запроса при первом открытии */
  initialPsychologists: PsychologistCatalogEntry[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const allPsychologists = initialPsychologists;

  /** Города только из выбранной страны; без страны — все города каталога. */
  const cityOptions = useMemo(() => {
    const pool =
      selectedCountry != null
        ? allPsychologists.filter(
            (p) => normalize(p.practiceCountry) === selectedCountry
          )
        : allPsychologists;
    const set = new Set<string>();
    for (const p of pool) {
      const c = normalize(p.practiceCity);
      if (c) set.add(c);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ru"));
  }, [allPsychologists, selectedCountry]);

  /** Город из состояния учитывается только если есть в текущем списке (после смены страны). */
  const activeCityFilter =
    selectedCity != null && cityOptions.includes(selectedCity)
      ? selectedCity
      : null;

  const countryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of allPsychologists) {
      const c = normalize(p.practiceCountry);
      if (c) set.add(c);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ru"));
  }, [allPsychologists]);

  const filtered = useMemo(() => {
    return allPsychologists.filter((p) => {
      if (activeCityFilter && normalize(p.practiceCity) !== activeCityFilter)
        return false;
      if (selectedCountry && normalize(p.practiceCountry) !== selectedCountry)
        return false;
      if (!matchesSearchTokens(p, deferredSearch)) return false;
      return true;
    });
  }, [allPsychologists, deferredSearch, activeCityFilter, selectedCountry]);

  const filtersActive =
    searchQuery.trim() !== "" || selectedCity !== null || selectedCountry !== null;

  function resetFilters() {
    setSearchQuery("");
    setSelectedCity(null);
    setSelectedCountry(null);
  }

  const total = allPsychologists.length;
  const shown = filtered.length;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="space-y-1.5 px-5 pb-4 pt-5 sm:px-7">
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Найти психолога
          </h1>
          <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
            {schedulingEnabled ? (
              <>
                Поиск по имени и тексту анкеты. Запись — на странице профиля.
              </>
            ) : (
              <>
                Ознакомьтесь со специалистами и откройте профиль — контакты для связи
                указаны на странице психолога. Онлайн-запись через сервис сейчас
                недоступна.
              </>
            )}
          </p>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:gap-x-3">
            <div className="w-full min-w-0 max-w-[min(100%,20rem)]">
              <Label
                htmlFor="psych-search"
                className="text-xs font-medium text-muted-foreground"
              >
                Поиск
              </Label>
              <div className="relative mt-1">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="psych-search"
                  placeholder="Имя, город…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-8 text-sm"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="w-full min-w-[10rem] max-w-[14rem]">
              <Label
                htmlFor="psych-country"
                className="text-xs font-medium text-muted-foreground"
              >
                Страна
              </Label>
              <Select
                value={selectedCountry ?? FILTER_ANY}
                onValueChange={(v) =>
                  setSelectedCountry(v === FILTER_ANY ? null : v)
                }
              >
                <SelectTrigger
                  id="psych-country"
                  className="mt-1 h-9 text-sm"
                  aria-label="Фильтр по стране"
                >
                  <SelectValue placeholder="Страна" />
                </SelectTrigger>
                <SelectContent className="max-h-[min(280px,50vh)]">
                  <SelectItem value={FILTER_ANY}>Все страны</SelectItem>
                  {countryOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full min-w-[10rem] max-w-[14rem]">
              <Label
                htmlFor="psych-city"
                className="text-xs font-medium text-muted-foreground"
              >
                Город
              </Label>
              <Select
                value={activeCityFilter ?? FILTER_ANY}
                onValueChange={(v) =>
                  setSelectedCity(v === FILTER_ANY ? null : v)
                }
              >
                <SelectTrigger
                  id="psych-city"
                  className="mt-1 h-9 text-sm"
                  aria-label="Фильтр по городу"
                >
                  <SelectValue placeholder="Город" />
                </SelectTrigger>
                <SelectContent className="max-h-[min(280px,50vh)]">
                  <SelectItem value={FILTER_ANY}>Все города</SelectItem>
                  {cityOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3 lg:ml-auto">
              <p
                className="text-xs text-muted-foreground sm:text-sm"
                aria-live="polite"
              >
                {total === 0 ? (
                  <>Нет специалистов в каталоге.</>
                ) : shown === total ? (
                  <>
                    Показано:{" "}
                    <span className="font-medium text-foreground">{shown}</span>
                  </>
                ) : (
                  <>
                    Найдено:{" "}
                    <span className="font-medium text-foreground">{shown}</span>{" "}
                    из{" "}
                    <span className="font-medium text-foreground">{total}</span>
                  </>
                )}
              </p>
              {filtersActive && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 gap-1 px-2 text-muted-foreground"
                  onClick={resetFilters}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                  Сбросить
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {total === 0 ? (
        <p className="rounded-xl border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          В каталоге пока нет опубликованных психологов. Загляните позже.
        </p>
      ) : shown === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            По текущим фильтрам никого не нашли. Попробуйте изменить поиск или
            сбросить фильтры.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={resetFilters}
          >
            Сбросить фильтры
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => {
            const nameId = `psych-name-${p.id}`;
            const initials = [p.firstName, p.lastName]
              .filter(Boolean)
              .map((s) => s[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            const professionLabel = getProfessionLabel(p.specialization);
            const bioTrimmed = normalize(p.bio);
            const profileHref = psychologistPublicProfilePath({
              publicRouteSerial: p.publicRouteSerial,
              publicSlug: p.publicSlug
            });
            const bookingHref = `${profileHref}#booking`;
            const locationLine = catalogLocationLine(p);

            return (
              <article
                key={p.id}
                aria-labelledby={nameId}
                className="h-full"
              >
                <Card className="relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-colors hover:border-primary/50">
                  <Link
                    href={profileHref}
                    aria-labelledby={nameId}
                    className="absolute inset-0 z-[1] rounded-2xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <CardContent className="pointer-events-none relative z-0 flex flex-col p-0">
                    <div className="relative aspect-square w-full overflow-hidden rounded-t-2xl bg-muted">
                      <Avatar className="absolute inset-0 h-full w-full rounded-none rounded-t-2xl">
                        <AvatarImage
                          src={p.profilePhotoUrl ?? undefined}
                          alt=""
                          className="rounded-none rounded-t-2xl object-cover"
                        />
                        <AvatarFallback className="bg-placeholder-surface rounded-none rounded-t-2xl text-2xl font-semibold tracking-tight text-muted-foreground">
                          {initials || "?"}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="space-y-2 px-3 pb-2 pt-2.5 text-center">
                      <p
                        id={nameId}
                        className="text-sm font-semibold leading-tight text-foreground sm:text-base"
                      >
                        {p.firstName} {p.lastName}
                      </p>
                      <div className="flex flex-col items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="max-w-full px-2 py-0 text-xs font-medium"
                        >
                          {professionLabel}
                        </Badge>
                        {locationLine ? (
                          <Badge
                            variant="outline"
                            className="max-w-full gap-1 px-2 py-0 text-xs font-normal text-muted-foreground"
                          >
                            <MapPin
                              className="h-3 w-3 shrink-0"
                              aria-hidden
                            />
                            <span className="truncate">{locationLine}</span>
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    {bioTrimmed ? (
                      <div className="px-3 pb-3 pt-0.5">
                        <p className="text-left text-sm leading-relaxed text-muted-foreground line-clamp-3">
                          {bioTrimmed}
                        </p>
                      </div>
                    ) : null}
                  </CardContent>
                  {schedulingEnabled ? (
                    <CardFooter className="relative z-[2] mt-auto pointer-events-auto border-t border-border/60 bg-card px-3 pb-4 pt-3">
                      <Button className="w-full" size="sm" asChild>
                        <Link href={bookingHref}>Записаться</Link>
                      </Button>
                    </CardFooter>
                  ) : null}
                </Card>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
