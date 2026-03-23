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

const HOURS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0")
);
const MINUTES = ["00", "10", "20", "30", "40", "50"];

type TimeInputProps = {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  className?: string;
};

export function TimeInput({ value, onChange, className }: TimeInputProps) {
  // После монтирования определяем тип устройства
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const parts = value.split(":");
  const hour = (parts[0] ?? "09").padStart(2, "0");
  const rawMin = parseInt(parts[1] ?? "0", 10) || 0;
  const snapped = Math.round(rawMin / 10) * 10;
  const minute = String(snapped >= 60 ? 0 : snapped).padStart(2, "0");

  // Мобильные — нативный пикер (на iOS = барабан как в будильнике)
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
          "h-9 w-auto min-w-[120px] rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring",
          className
        )}
      />
    );
  }

  // Десктоп — два отдельных Select: часы и минуты
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Select value={hour} onValueChange={h => onChange(`${h}:${minute}`)}>
        <SelectTrigger className="h-9 w-[4.5rem] text-sm">
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
        <SelectTrigger className="h-9 w-[4.5rem] text-sm">
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
