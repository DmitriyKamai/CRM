/** Часть `PsychologistProfile.settingsJson` — UI списка клиентов. */
export type ClientsTableSettings = {
  columnOrder?: string[];
};

export function parseProfileSettingsJson(settingsJson: unknown): Record<string, unknown> {
  if (!settingsJson || typeof settingsJson !== "object" || Array.isArray(settingsJson)) {
    return {};
  }
  return { ...(settingsJson as Record<string, unknown>) };
}

/** Порядок колонок из настроек или null, если не задан / невалиден. */
export function getClientsTableColumnOrderFromSettings(settingsJson: unknown): string[] | null {
  const cur = parseProfileSettingsJson(settingsJson);
  const ct = cur.clientsTable;
  if (!ct || typeof ct !== "object" || Array.isArray(ct)) return null;
  const co = (ct as ClientsTableSettings).columnOrder;
  if (!Array.isArray(co)) return null;
  const out = co.filter((x): x is string => typeof x === "string" && x.length > 0 && x.length <= 256);
  return out.length ? out : null;
}

export function mergeClientsTableColumnOrder(
  settingsJson: unknown,
  columnOrder: string[]
): Record<string, unknown> {
  const cur = parseProfileSettingsJson(settingsJson);
  const prevCt =
    cur.clientsTable && typeof cur.clientsTable === "object" && !Array.isArray(cur.clientsTable)
      ? { ...(cur.clientsTable as Record<string, unknown>) }
      : {};
  return {
    ...cur,
    clientsTable: {
      ...prevCt,
      columnOrder
    }
  };
}
