"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Psychologist = {
  id: string;
  firstName: string;
  lastName: string;
  specialization: string | null;
  bio: string | null;
  country: string | null;
  city: string | null;
  profilePhotoUrl: string | null;
};

const PROFESSION_LABELS: Record<string, string> = {
  psychologist: "Психолог",
  psychotherapist: "Врач-психотерапевт",
  psychiatrist: "Психиатр"
};

function getProfessionLabel(specialization: string | null | undefined): string {
  if (!specialization?.trim()) return "Специалист";
  return PROFESSION_LABELS[specialization.trim()] ?? "Специалист";
}

export function PublicPsychologistsList() {
  const [allPsychologists, setAllPsychologists] = useState<Psychologist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [countryFilter, setCountryFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/client/psychologists");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data?.message ?? "Не удалось загрузить список психологов"
          );
        }
        const data = (await res.json()) as { psychologists: Psychologist[] };
        if (!cancelled) {
          setAllPsychologists(data.psychologists ?? []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Не удалось загрузить список психологов"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const country = countryFilter.trim().toLowerCase();
    const city = cityFilter.trim().toLowerCase();

    return allPsychologists.filter((p) => {
      const pCountry = (p.country ?? "").trim().toLowerCase();
      const pCity = (p.city ?? "").trim().toLowerCase();

      if (country && !pCountry.includes(country)) return false;
      if (city && !pCity.includes(city)) return false;
      return true;
    });
  }, [allPsychologists, countryFilter, cityFilter]);

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Найти психолога
        </h1>
        <p className="text-sm text-muted-foreground">
          Подберите специалиста по стране и городу, чтобы дальше выбрать
          удобное время записи.
        </p>
      </section>

      <section className="rounded-xl border bg-card px-4 py-3 sm:px-6 sm:py-4">
        <form
          className="grid items-end gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="space-y-1">
            <Label htmlFor="country">Страна</Label>
            <Input
              id="country"
              placeholder="Например, Беларусь"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="city">Город</Label>
            <Input
              id="city"
              placeholder="Например, Минск"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
            />
          </div>
          <div className="space-y-1 text-xs text-muted-foreground md:col-span-1 lg:col-span-2">
            <p>
              Фильтрация по вхождению текста — как только вы меняете значения,
              список обновляется.
            </p>
          </div>
          <div className="sm:col-span-2 md:col-span-1 lg:col-span-1 flex justify-start sm:justify-end">
            <Button type="submit" className="w-full sm:w-auto">
              Найти
            </Button>
          </div>
        </form>
      </section>

      {error && (
        <p className="text-sm text-destructive">
          {error || "Не удалось загрузить список психологов"}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Загружаем психологов…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          По выбранным параметрам психологи не найдены. Попробуйте изменить
          фильтр.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const initials = [p.firstName, p.lastName]
              .filter(Boolean)
              .map((s) => s[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            const professionLabel = getProfessionLabel(p.specialization);
            const bioShort = p.bio?.trim()
              ? p.bio.trim().slice(0, 200) +
                (p.bio.length > 200 ? "…" : "")
              : null;

            return (
              <Link
                key={p.id}
                href={`/client/psychologists/${p.id}`}
                className="group block h-full"
              >
                <Card className="flex h-full flex-col overflow-hidden transition-colors hover:border-primary/60 cursor-pointer">
                  <CardContent className="flex flex-col p-0">
                    <div className="relative w-full overflow-hidden rounded-t-lg bg-muted aspect-square">
                      <Avatar className="absolute inset-0 h-full w-full rounded-none rounded-t-lg">
                        <AvatarImage
                          src={p.profilePhotoUrl ?? undefined}
                          alt={`${p.firstName} ${p.lastName}`}
                          className="rounded-none rounded-t-lg object-cover"
                        />
                        <AvatarFallback className="rounded-none rounded-t-lg text-4xl font-medium text-muted-foreground">
                          {initials || "?"}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex flex-col p-4">
                      <div className="w-full space-y-1 text-center">
                        <p className="font-semibold text-foreground">
                          {p.firstName} {p.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {professionLabel}
                        </p>
                        {(p.country || p.city) && (
                          <p className="text-xs text-muted-foreground">
                            {[p.country, p.city]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        )}
                      </div>
                      {bioShort && (
                        <p className="mt-3 w-full text-left text-sm text-muted-foreground line-clamp-4">
                          {bioShort}
                        </p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="mt-auto px-4 pb-6 pt-4">
                    <Button className="w-full" variant="secondary">
                      Записаться
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

