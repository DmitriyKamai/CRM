"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  THERAPY_APPROACH_FAMILIES,
  THERAPY_APPROACH_FAMILY_LABELS,
  type TherapyApproachDto
} from "@/lib/settings/therapy-approaches";

type Grouped = Array<{
  key: (typeof THERAPY_APPROACH_FAMILIES)[number] | "other";
  label: string;
  items: TherapyApproachDto[];
}>;

function groupOptions(list: TherapyApproachDto[]): Grouped {
  const order: Record<string, number> = Object.fromEntries(
    THERAPY_APPROACH_FAMILIES.map((f, i) => [f, i])
  );
  const map = new Map<string, TherapyApproachDto[]>();
  for (const a of list) {
    const fam = a.family;
    if (!map.has(fam)) map.set(fam, []);
    map.get(fam)!.push(a);
  }
  const groups: Grouped = [];
  for (const family of THERAPY_APPROACH_FAMILIES) {
    const items = map.get(family);
    if (!items?.length) continue;
    items.sort(
      (a, b) => a.orderIndex - b.orderIndex || a.nameRu.localeCompare(b.nameRu, "ru")
    );
    groups.push({
      key: family,
      label: THERAPY_APPROACH_FAMILY_LABELS[family],
      items
    });
  }
  groups.sort((a, b) => (order[a.key] ?? 99) - (order[b.key] ?? 99));
  return groups;
}

type Props = {
  id: string;
  options: TherapyApproachDto[];
  value: string[];
  onChange: (slugs: string[]) => void;
};

/**
 * Мультивыбор подходов в каталоге: показываем специалистов, у кого есть хотя бы один из отмеченных.
 */
export function PsychologistCatalogApproachFilter({
  id,
  options,
  value,
  onChange
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => new Set(value), [value]);
  const grouped = useMemo(() => groupOptions(options), [options]);

  function toggle(slug: string) {
    if (selected.has(slug)) {
      onChange(value.filter((s) => s !== slug));
    } else {
      onChange([...value, slug]);
    }
  }

  function clearAll() {
    onChange([]);
  }

  const count = value.length;
  const labelShort =
    count === 0 ? "Все подходы" : `Подходы · ${count}`;

  if (options.length === 0) {
    return null;
  }

  return (
    <div className="w-full min-w-0 sm:min-w-[10rem] sm:max-w-[16rem]">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        Подход
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            id={id}
            variant="outline"
            className={cn(
              "mt-1 h-9 w-full justify-between px-2.5 text-left font-normal transition-colors sm:min-w-[10rem]",
              count > 0 && "border-primary/50 bg-primary/5 text-foreground"
            )}
            aria-expanded={open}
            aria-label={
              count === 0
                ? "Фильтр по методу терапии, не выбрано"
                : `Фильтр по методу терапии, выбрано: ${count}`
            }
          >
            <span className="min-w-0 flex-1 truncate text-sm">
              {labelShort}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(100vw-2rem,20rem)] p-0"
          align="start"
        >
          <div className="border-b border-border/60 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Показываем специалистов, у кого в анкете указан{" "}
              <span className="text-foreground">хотя бы один</span> из выбранных
              подходов.
            </p>
          </div>
          <ScrollArea className="h-[min(18rem,50vh)] p-2">
            <div className="space-y-3 pr-1">
              {grouped.map((g) => (
                <div key={g.key} className="space-y-1.5">
                  <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {g.label}
                  </p>
                  {g.items.map((item) => {
                    const checked = selected.has(item.slug);
                    const checkId = `${id}-${item.slug}`;
                    return (
                      <div
                        key={item.slug}
                        className="flex items-start gap-2 rounded-md px-1 py-1.5 hover:bg-muted/50"
                      >
                        <Checkbox
                          id={checkId}
                          checked={checked}
                          onCheckedChange={() => toggle(item.slug)}
                          className="mt-0.5 shrink-0"
                        />
                        <Label
                          htmlFor={checkId}
                          className="min-w-0 flex-1 cursor-pointer text-sm font-normal leading-tight"
                        >
                          {item.nameRu}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </ScrollArea>
          {count > 0 && (
            <div className="border-t border-border/60 p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-full text-xs"
                onClick={clearAll}
              >
                Сбросить выбор
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
