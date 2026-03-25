import * as React from "react";

import { Input } from "@/components/ui/input";

function normalizeRaw(value: string | undefined | null): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (!digits) {
    return "+375";
  }
  return `+${digits}`;
}

function formatPhone(value: string | undefined | null): string {
  const raw = normalizeRaw(value);

  // Belarus (+375) mask: +375 (xx) xxx-xx-xx
  if (raw.startsWith("+375")) {
    const digits = raw.replace(/\D/g, ""); // 375XXXXXXXXX
    const rest = digits.slice(3); // XXXXXXXXX

    const part1 = rest.slice(0, 2);
    const part2 = rest.slice(2, 5);
    const part3 = rest.slice(5, 7);
    const part4 = rest.slice(7, 9);

    let result = "+375";
    if (part1) result += ` (${part1}`;
    if (part1 && part1.length === 2) result += ")";
    if (part2) result += `${part1.length === 2 ? " " : ""}${part2}`;
    if (part3) result += `-${part3}`;
    if (part4) result += `-${part4}`;

    return result;
  }

  // Generic international: +<country> <rest>
  const digits = raw.replace(/\D/g, "");
  const country = digits.slice(0, 3);
  const rest = digits.slice(3);
  return rest ? `+${country} ${rest}` : `+${country}`;
}

export function formatPhoneDisplay(value?: string | null): string {
  if (!value || value.trim().length === 0) {
    return "—";
  }
  return formatPhone(value);
}

/** Ссылка `tel:` для набора номера; `null`, если цифр нет. */
export function phoneToTelHref(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  return `tel:+${digits}`;
}

type PhoneInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> & {
  value?: string;
  onChange?: (value: string) => void;
};

export function PhoneInput({
  value,
  onChange,
  placeholder = "+375 (29) 123-45-67",
  ...props
}: PhoneInputProps) {
  const displayValue = value ? formatPhone(value) : "";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let next = e.target.value;
    // оставляем только цифры и плюс
    next = next.replace(/[^\d+]/g, "");
    if (!next.startsWith("+")) {
      next = `+${next.replace(/\D/g, "")}`;
    }

    const normalized = normalizeRaw(next);
    if (onChange) {
      onChange(normalized);
    }
  }

  return (
    <Input
      type="tel"
      inputMode="tel"
      {...props}
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
    />
  );
}

