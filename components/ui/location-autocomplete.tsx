"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { COUNTRIES_RU } from "@/lib/data/countries-ru";

const MAX_SUGGESTIONS = 8;

function filterCountries(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return COUNTRIES_RU.slice(0, MAX_SUGGESTIONS);
  return COUNTRIES_RU.filter((c) =>
    c.name.toLowerCase().includes(q)
  ).slice(0, MAX_SUGGESTIONS);
}

type CountryAutocompleteProps = {
  value: string;
  onChange: (name: string, isoCode: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
};

export function CountryAutocomplete({
  value,
  onChange,
  placeholder = "Страна",
  id,
  className,
  disabled
}: CountryAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const suggestions = useMemo(
    () => filterCountries(inputValue),
    [inputValue]
  );

  const handleSelect = useCallback(
    (name: string, isoCode: string) => {
      onChange(name, isoCode);
      setInputValue(name);
      setOpen(false);
    },
    [onChange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setInputValue(v);
      if (v.trim() === "") {
        onChange("", "");
      } else {
        setOpen(true);
      }
    },
    [onChange]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => !disabled && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          disabled={disabled}
          className={cn("cursor-text", className)}
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ul className="max-h-[220px] overflow-auto py-1">
          {suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              Ничего не найдено
            </li>
          ) : (
            suggestions.map((c) => (
              <li
                key={c.isoCode}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground outline-none"
                role="option"
                aria-selected={c.name === value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(c.name, c.isoCode);
                }}
              >
                {c.name}
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

type CityAutocompleteProps = {
  value: string;
  onChange: (name: string) => void;
  countryCode: string | null;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
};

export function CityAutocomplete({
  value,
  onChange,
  countryCode,
  placeholder = "Город",
  id,
  className,
  disabled: disabledProp
}: CityAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (!countryCode) {
      setCities([]);
      return;
    }
    let cancelled = false;
    // Загружаем города через API (country-state-city работает только server-side)
    fetch(`/api/cities?country=${encodeURIComponent(countryCode)}`)
      .then((r) => (r.ok ? r.json() : { cities: [] }))
      .then((data: { cities: string[] }) => {
        if (!cancelled) setCities(data.cities ?? []);
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      });
    return () => {
      cancelled = true;
    };
  }, [countryCode]);

  const suggestions = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return cities.slice(0, MAX_SUGGESTIONS);
    return cities
      .filter((c) => c.toLowerCase().includes(q))
      .slice(0, MAX_SUGGESTIONS);
  }, [cities, inputValue]);

  const handleSelect = useCallback(
    (name: string) => {
      onChange(name);
      setInputValue(name);
      setOpen(false);
    },
    [onChange]
  );

  const commitInputValue = useCallback(() => {
    const v = inputValue.trim();
    if (v !== value) onChange(v);
  }, [inputValue, value, onChange]);

  const disabled = disabledProp || !countryCode;

  return (
    <Popover
      open={open}
      onOpenChange={(openState) => {
        if (!openState) commitInputValue();
        setOpen(openState);
      }}
    >
      <PopoverTrigger asChild>
        <Input
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={commitInputValue}
          placeholder={disabled ? "Сначала выберите страну" : placeholder}
          autoComplete="off"
          disabled={disabled}
          className={cn("cursor-text", className)}
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ul className="max-h-[220px] overflow-auto py-1">
          {suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              {disabled ? "Выберите страну" : "Нет в списке — можно ввести свой вариант"}
            </li>
          ) : (
            suggestions.map((name) => (
              <li
                key={name}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground outline-none"
                role="option"
                aria-selected={name === value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(name);
                }}
              >
                {name}
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
