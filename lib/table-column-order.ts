import type { ColumnDef } from "@tanstack/react-table";

/** Стабильный id колонки из определения TanStack Table. */
export function getColumnIdsFromDefs<TData, TValue>(
  columns: ColumnDef<TData, TValue>[]
): string[] {
  return columns
    .map(col => {
      if ("id" in col && col.id) return col.id;
      if ("accessorKey" in col && typeof col.accessorKey === "string") {
        return col.accessorKey;
      }
      return "";
    })
    .filter(Boolean);
}

/**
 * Собирает итоговый порядок: фиксированные колонки слева, затем сохранённый порядок
 * для остальных, в конец — новые id из текущей схемы.
 */
export function normalizeColumnOrder(
  saved: string[] | null | undefined,
  currentIds: string[],
  fixedIds: readonly string[]
): string[] {
  const fixedSet = new Set(fixedIds);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const id of fixedIds) {
    if (currentIds.includes(id)) {
      result.push(id);
      seen.add(id);
    }
  }

  if (saved?.length) {
    for (const id of saved) {
      if (fixedSet.has(id)) continue;
      if (currentIds.includes(id) && !seen.has(id)) {
        result.push(id);
        seen.add(id);
      }
    }
  }

  for (const id of currentIds) {
    if (!seen.has(id)) {
      result.push(id);
      seen.add(id);
    }
  }

  return result;
}
