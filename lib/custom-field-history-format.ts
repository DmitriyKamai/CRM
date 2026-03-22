import type { CustomFieldDefinition, CustomFieldType } from "@prisma/client";

type DefPick = Pick<CustomFieldDefinition, "type" | "label"> & {
  options?: unknown;
};

/** Сравнение JSON-значений полей (как приходит из БД и из запроса). */
export function jsonValueEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function formatCustomFieldValueForHistory(value: unknown, def: DefPick): string {
  if (value === null || value === undefined) return "—";

  const t = def.type as CustomFieldType;

  if (t === "BOOLEAN") {
    if (value === true) return "Да";
    if (value === false) return "Нет";
    return String(value);
  }

  if (t === "SELECT") {
    const opts =
      (def.options as { selectOptions?: { value: string; label: string }[] } | null)
        ?.selectOptions ?? [];
    const s = String(value);
    const found = opts.find((o) => o.value === s);
    return found?.label ?? s;
  }

  if (t === "MULTI_SELECT") {
    if (!Array.isArray(value)) return String(value);
    const opts =
      (def.options as { selectOptions?: { value: string; label: string }[] } | null)
        ?.selectOptions ?? [];
    const map = new Map(opts.map((o) => [o.value, o.label]));
    return value
      .map((v) => map.get(String(v)) ?? String(v))
      .join(", ");
  }

  if (t === "NUMBER") {
    return String(value);
  }

  if (t === "DATE") {
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("ru-RU");
  }

  if (t === "MULTILINE" || t === "TEXT") {
    const s = String(value).trim();
    if (!s) return "—";
    return s.length > 160 ? `${s.slice(0, 157)}…` : s;
  }

  return String(value);
}
