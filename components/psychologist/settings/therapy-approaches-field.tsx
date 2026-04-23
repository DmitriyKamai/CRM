"use client";

import { useMemo } from "react";
import { Info } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { useTherapyApproachesDirectory } from "@/hooks/use-therapy-approaches-directory";
import {
  MAX_THERAPY_APPROACHES_PER_PSYCHOLOGIST,
  THERAPY_APPROACH_FAMILIES,
  THERAPY_APPROACH_FAMILY_LABELS,
  type TherapyApproachDto
} from "@/lib/settings/therapy-approaches";

type Props = {
  selectedSlugs: string[];
  onChange: (slugs: string[]) => void;
};

type GroupedApproaches = Array<{
  family: (typeof THERAPY_APPROACH_FAMILIES)[number];
  label: string;
  items: TherapyApproachDto[];
}>;

function groupByFamily(list: TherapyApproachDto[]): GroupedApproaches {
  const order: Record<string, number> = Object.fromEntries(
    THERAPY_APPROACH_FAMILIES.map((f, i) => [f, i])
  );
  const buckets = new Map<string, TherapyApproachDto[]>();
  for (const item of list) {
    const bucket = buckets.get(item.family) ?? [];
    bucket.push(item);
    buckets.set(item.family, bucket);
  }
  const groups: GroupedApproaches = [];
  for (const family of THERAPY_APPROACH_FAMILIES) {
    const items = buckets.get(family);
    if (!items || items.length === 0) continue;
    items.sort((a, b) => a.orderIndex - b.orderIndex || a.nameRu.localeCompare(b.nameRu, "ru"));
    groups.push({
      family,
      label: THERAPY_APPROACH_FAMILY_LABELS[family],
      items
    });
  }
  groups.sort(
    (a, b) => (order[a.family] ?? 99) - (order[b.family] ?? 99)
  );
  return groups;
}

export function TherapyApproachesField({ selectedSlugs, onChange }: Props) {
  const { data, isLoading, isError } = useTherapyApproachesDirectory();

  const grouped = useMemo(() => groupByFamily(data ?? []), [data]);
  const selectedSet = useMemo(() => new Set(selectedSlugs), [selectedSlugs]);
  const limitReached = selectedSlugs.length >= MAX_THERAPY_APPROACHES_PER_PSYCHOLOGIST;

  function toggle(slug: string, nextChecked: boolean) {
    if (nextChecked) {
      if (selectedSet.has(slug)) return;
      if (limitReached) return;
      onChange([...selectedSlugs, slug]);
    } else {
      onChange(selectedSlugs.filter((s) => s !== slug));
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            Методы работы
          </h3>
          <p className="text-xs text-muted-foreground">
            Отметьте подходы, в которых практикуете — не больше{" "}
            {MAX_THERAPY_APPROACHES_PER_PSYCHOLOGIST}. Будут показаны клиентам на
            странице профиля и помогут им выбрать специалиста.
          </p>
        </div>
        <p
          className="shrink-0 text-xs text-muted-foreground"
          aria-live="polite"
        >
          Выбрано:{" "}
          <span className="font-medium text-foreground">
            {selectedSlugs.length}
          </span>{" "}
          / {MAX_THERAPY_APPROACHES_PER_PSYCHOLOGIST}
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Загрузка справочника…</p>
      )}
      {isError && (
        <p className="text-sm text-destructive">
          Не удалось загрузить список подходов. Обновите страницу.
        </p>
      )}

      {!isLoading && !isError && grouped.length > 0 && (
        <TooltipProvider delayDuration={200}>
          <div className="space-y-4">
            {grouped.map((group) => (
              <fieldset key={group.family} className="space-y-2">
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.items.map((item) => {
                    const checked = selectedSet.has(item.slug);
                    const disabled = !checked && limitReached;
                    const inputId = `ta-${item.slug}`;
                    return (
                      <div
                        key={item.slug}
                        className={
                          "flex items-start gap-2 rounded-md border border-transparent px-2 py-1.5 hover:border-border/60 " +
                          (disabled ? "opacity-50" : "")
                        }
                      >
                        <Checkbox
                          id={inputId}
                          checked={checked}
                          disabled={disabled}
                          onCheckedChange={(v) => toggle(item.slug, v === true)}
                          className="mt-0.5 shrink-0"
                        />
                        <Label
                          htmlFor={inputId}
                          className="min-w-0 cursor-pointer text-sm font-normal leading-snug"
                        >
                          <span className="font-medium text-foreground">
                            {item.nameRu}
                          </span>
                        </Label>
                        {item.description && (
                          <Tooltip>
                            <TooltipTrigger
                              type="button"
                              aria-label={`Что такое ${item.nameRu}`}
                              className="ml-auto shrink-0 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
                            >
                              <Info className="h-3.5 w-3.5" aria-hidden />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs leading-relaxed">
                              {item.description}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        </TooltipProvider>
      )}

      {limitReached && (
        <p className="text-xs text-muted-foreground">
          Достигнут лимит в {MAX_THERAPY_APPROACHES_PER_PSYCHOLOGIST} подходов.
          Снимите отметку с лишнего, чтобы выбрать другой.
        </p>
      )}
    </div>
  );
}
