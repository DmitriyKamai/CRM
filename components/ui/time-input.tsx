"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// 00:00 – 23:50 с шагом 10 минут
const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 10) {
    TIME_OPTIONS.push(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    );
  }
}

// Округление до ближайшего 10-минутного слота
function snapToSlot(value: string): string {
  const [h, m] = value.split(":").map(v => parseInt(v, 10) || 0);
  const snappedM = Math.round(m / 10) * 10;
  if (snappedM >= 60) {
    return `${String(Math.min(23, h + 1)).padStart(2, "0")}:00`;
  }
  return `${String(h).padStart(2, "0")}:${String(snappedM).padStart(2, "0")}`;
}

type TimeInputProps = {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  className?: string;
};

export function TimeInput({ value, onChange, className }: TimeInputProps) {
  // На сервере рендерим десктопный вариант — меняем после монтирования
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  if (isMobile) {
    return (
      <input
        type="time"
        step={600}
        value={value}
        onChange={e => {
          if (e.target.value) onChange(e.target.value);
        }}
        className={cn(
          "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring",
          className
        )}
      />
    );
  }

  return (
    <Select value={snapToSlot(value)} onValueChange={onChange}>
      <SelectTrigger className={cn("h-9 text-sm", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-60 overflow-y-auto">
        {TIME_OPTIONS.map(t => (
          <SelectItem key={t} value={t}>
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
