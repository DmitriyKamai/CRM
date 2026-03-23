"use client";

import { cn } from "@/lib/utils";

type TimeInputProps = {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  className?: string;
};

const inputCls =
  "h-9 w-12 rounded-md border border-input bg-background text-center text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-ring [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

export function TimeInput({ value, onChange, className }: TimeInputProps) {
  const h = Math.min(23, Math.max(0, parseInt(value?.split(":")[0] ?? "0", 10) || 0));
  const m = Math.min(59, Math.max(0, parseInt(value?.split(":")[1] ?? "0", 10) || 0));

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <input
        type="number"
        min={0}
        max={23}
        value={h}
        onChange={e => {
          const v = Math.min(23, Math.max(0, parseInt(e.target.value, 10) || 0));
          onChange(`${String(v).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
        }}
        className={inputCls}
        aria-label="Часы"
        placeholder="чч"
      />
      <span className="select-none text-sm font-medium text-muted-foreground">:</span>
      <input
        type="number"
        min={0}
        max={59}
        step={10}
        value={m}
        onChange={e => {
          const v = Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0));
          onChange(`${String(h).padStart(2, "0")}:${String(v).padStart(2, "0")}`);
        }}
        className={inputCls}
        aria-label="Минуты"
        placeholder="мм"
      />
    </div>
  );
}
