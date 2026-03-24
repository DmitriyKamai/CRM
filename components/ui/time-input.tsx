"use client";

import { useSyncExternalStore } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0")
);
const MINUTES = ["00", "10", "20", "30", "40", "50"];

function subscribePointer(cb: () => void) {
  const mq = window.matchMedia("(pointer: coarse)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

type TimeInputProps = {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  className?: string;
};

export function TimeInput({ value, onChange, className }: TimeInputProps) {
  const isMobile = useSyncExternalStore(
    subscribePointer,
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false
  );

  const parts = value.split(":");
  const hour = (parts[0] ?? "09").padStart(2, "0");
  const rawMin = parseInt(parts[1] ?? "0", 10) || 0;
  const snapped = Math.round(rawMin / 10) * 10;
  const minute = String(snapped >= 60 ? 0 : snapped).padStart(2, "0");

  // Мобильные — нативный пикер (на iOS = барабан как в будильнике).
  // Обёртка min-w-0: иначе WebKit даёт type=time огромный intrinsic min-width и поле «выпирает» вправо в модалках/grid.
  if (isMobile) {
    return (
      <div className={cn("w-full min-w-0", className)}>
        <input
          type="time"
          step={600}
          value={value}
          onChange={e => {
            if (e.target.value) onChange(e.target.value);
          }}
          className={cn(
            "box-border h-9 w-full min-w-0 max-w-full rounded-md border border-input bg-[hsl(var(--input-bg))] px-3 text-sm leading-none",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
            // компактнее индикатор справа (Safari / Chrome)
            "[&::-webkit-calendar-picker-indicator]:ml-0 [&::-webkit-calendar-picker-indicator]:mr-0 [&::-webkit-calendar-picker-indicator]:opacity-60"
          )}
        />
      </div>
    );
  }

  // Десктоп — два отдельных Select: часы и минуты
  return (
    <div className={cn("flex w-full items-center gap-1", className)}>
      <Select value={hour} onValueChange={h => onChange(`${h}:${minute}`)}>
        <SelectTrigger className="h-9 flex-1 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-60 overflow-y-auto">
          {HOURS.map(h => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="select-none text-sm font-semibold text-muted-foreground">
        :
      </span>

      <Select value={minute} onValueChange={m => onChange(`${hour}:${m}`)}>
        <SelectTrigger className="h-9 flex-1 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map(m => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
