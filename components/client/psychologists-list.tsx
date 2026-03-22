"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Search, X } from "lucide-react";

import type { PsychologistCatalogEntry } from "@/lib/psychologists-catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    p.country,
    p.city,
    p.bio ?? ""
  ]
    .map((x) => String(x ?? "").toLowerCase())
    .join(" \n ");
  return tokens.every((t) => hay.includes(t));
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

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of allPsychologists) {
      const c = normalize(p.city);
      if (c) set.add(c);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ru"));
  }, [allPsychologists]);

  const countryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of allPsychologists) {
      const c = normalize(p.country);
      if (c) set.add(c);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ru"));
  }, [allPsychologists]);

  const filtered = useMemo(() => {
    return allPsychologists.filter((p) => {
      if (selectedCity && normalize(p.city) !== selectedCity) return false;
      if (selectedCountry && normalize(p.country) !== selectedCountry) return false;
      if (!matchesSearchTokens(p, deferredSearch)) return false;
      return true;
    });
  }, [allPsychologists, deferredSearch, selectedCity, selectedCountry]);

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
        <div
          className="h-16 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent sm:h-20"
          aria-hidden
        />
        <div className="space-y-2 px-5 pb-5 pt-2 sm:px-7">
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Найти психолога
          </h1>
          <p className="max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
            {schedulingEnabled ? (
              <>
                Подберите специалиста: поиск по имени и месту, фильтры по городу и
                стране. Затем можно записаться на удобное время на странице
                профиля.
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

      <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="psych-search" className="text-foreground">
              Поиск
            </Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="psych-search"
                placeholder="Имя, фамилия, город, страна…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoComplete="off"
              />
            </div>
          </div>

          {countryOptions.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Страна
              </p>
              <div className="flex flex-wrap gap-2">
                {countryOptions.map((c) => {
                  const active = selectedCountry === c;
                  return (
                    <Button
                      key={c}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "outline"}
                      className="rounded-full"
                      onClick={() =>
                        setSelectedCountry((prev) => (prev === c ? null : c))
                      }
                    >
                      {c}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {cityOptions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Город
              </p>
              <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto pr-1 sm:max-h-none">
                {cityOptions.map((c) => {
                  const active = selectedCity === c;
                  return (
                    <Button
                      key={c}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "outline"}
                      className="rounded-full"
                      onClick={() =>
                        setSelectedCity((prev) => (prev === c ? null : c))
                      }
                    >
                      {c}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {total === 0 ? (
                <>В каталоге пока нет специалистов.</>
              ) : shown === total ? (
                <>
                  Показано: <span className="font-medium text-foreground">{shown}</span>
                </>
              ) : (
                <>
                  Найдено:{" "}
                  <span className="font-medium text-foreground">{shown}</span> из{" "}
                  <span className="font-medium text-foreground">{total}</span>
                </>
              )}
            </p>
            {filtersActive && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 gap-1 text-muted-foreground"
                onClick={resetFilters}
              >
                <X className="h-4 w-4" aria-hidden />
                Сбросить фильтры
              </Button>
            )}
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
            const fullName = `${p.firstName} ${p.lastName}`.trim() || "Специалист";
            const nameId = `psych-name-${p.id}`;
            const initials = [p.firstName, p.lastName]
              .filter(Boolean)
              .map((s) => s[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            const professionLabel = getProfessionLabel(p.specialization);
            const bioTrimmed = normalize(p.bio);
            const profileHref = `/client/psychologists/${p.id}`;
            const bookingHref = `${profileHref}#booking`;
            const locationLine = [normalize(p.city), normalize(p.country)]
              .filter(Boolean)
              .join(", ");

            return (
              <article
                key={p.id}
                aria-labelledby={nameId}
                className="h-full"
              >
                <Card className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-colors hover:border-primary/50">
                  <CardContent className="flex flex-col p-0">
                    <Link
                      href={profileHref}
                      className="block text-left outline-none transition-colors hover:bg-muted/35 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-t-2xl bg-muted">
                        <Avatar className="absolute inset-0 h-full w-full rounded-none rounded-t-2xl">
                          <AvatarImage
                            src={p.profilePhotoUrl ?? undefined}
                            alt={fullName}
                            className="rounded-none rounded-t-2xl object-cover"
                          />
                          <AvatarFallback
                            className="rounded-none rounded-t-2xl bg-gradient-to-br from-violet-500/30 via-primary/25 to-sky-500/25 text-3xl font-semibold tracking-tight text-primary/90 sm:text-4xl"
                          >
                            {initials || "?"}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="space-y-3 p-4 pb-3 text-center">
                        <p
                          id={nameId}
                          className="font-semibold text-foreground"
                        >
                          {p.firstName} {p.lastName}
                        </p>
                        <div className="flex flex-col items-center gap-2">
                          <Badge variant="secondary" className="font-medium">
                            {professionLabel}
                          </Badge>
                          {locationLine ? (
                            <Badge
                              variant="outline"
                              className="max-w-full gap-1 font-normal text-muted-foreground"
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
                    </Link>
                    {bioTrimmed ? (
                      <div className="px-4 pb-4">
                        <p className="text-left text-sm leading-relaxed text-muted-foreground line-clamp-3">
                          {bioTrimmed}
                        </p>
                        <Link
                          href={profileHref}
                          className="mt-2 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                        >
                          Читать профиль
                        </Link>
                      </div>
                    ) : null}
                  </CardContent>
                  <CardFooter className="mt-auto flex flex-col gap-2 px-4 pb-6 pt-2">
                    {schedulingEnabled ? (
                      <>
                        <Button className="w-full" asChild>
                          <Link href={bookingHref}>Записаться</Link>
                        </Button>
                        <Button variant="outline" className="w-full" asChild>
                          <Link href={profileHref}>Подробнее</Link>
                        </Button>
                      </>
                    ) : (
                      <Button className="w-full" asChild>
                        <Link href={profileHref}>Подробнее</Link>
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
