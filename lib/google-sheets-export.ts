import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

/** Лист, куда пишем выгрузку (создаётся при отсутствии). */
export const CLIENTS_SHEET_TITLE = "Клиенты CRM";

export function isGoogleSheetsConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim());
}

function getSheets() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON не задан");
  }
  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON: невалидный JSON");
  }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES
  });
  return google.sheets({ version: "v4", auth });
}

async function ensureSheet(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  title: string
): Promise<number> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = meta.data.sheets?.find((s) => s.properties?.title === title);
  if (existing?.properties?.sheetId != null) {
    return existing.properties.sheetId;
  }
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: { title }
          }
        }
      ]
    }
  });
  const after = await sheets.spreadsheets.get({ spreadsheetId });
  const created = after.data.sheets?.find((s) => s.properties?.title === title);
  return created?.properties?.sheetId ?? 0;
}

/**
 * Полная перезапись листа: заголовок + строки (как в CSV).
 */
export async function writeClientsTableToSpreadsheet(
  spreadsheetId: string,
  headers: string[],
  rows: string[][]
): Promise<void> {
  const sheets = getSheets();
  await ensureSheet(sheets, spreadsheetId, CLIENTS_SHEET_TITLE);

  const safeTitle = `'${CLIENTS_SHEET_TITLE.replace(/'/g, "''")}'`;
  const matrix = [headers, ...rows];

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${safeTitle}!A:ZZ`
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${safeTitle}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: matrix }
  });
}

/** ID сохранённой таблицы из `PsychologistProfile.settingsJson.googleSheets.spreadsheetId`. */
export function getSpreadsheetIdFromProfileSettings(
  settingsJson: unknown
): string | null {
  if (!settingsJson || typeof settingsJson !== "object" || Array.isArray(settingsJson)) {
    return null;
  }
  const gs = (settingsJson as Record<string, unknown>).googleSheets;
  if (!gs || typeof gs !== "object" || Array.isArray(gs)) return null;
  const id = (gs as Record<string, unknown>).spreadsheetId;
  if (typeof id === "string" && id.trim().length > 0) return id.trim();
  return null;
}

/** Извлекает ID таблицы из URL или возвращает строку, если это уже ID. */
export function parseSpreadsheetId(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  const fromUrl = t.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (fromUrl) return fromUrl[1];
  if (/^[a-zA-Z0-9-_]+$/.test(t) && t.length >= 30) return t;
  return null;
}
