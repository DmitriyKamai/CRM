import { existsSync, readFileSync } from "fs";

import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

export type GoogleSheetsCredentialsStatus = "missing" | "invalid" | "ok";

function stripBom(s: string): string {
  return s.startsWith("\uFEFF") ? s.slice(1) : s;
}

function getRawServiceAccountJsonString(): string | null {
  const b64 =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64?.trim();
  if (b64) {
    try {
      return stripBom(Buffer.from(b64, "base64").toString("utf8")).trim();
    } catch {
      return null;
    }
  }

  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (inline) {
    return stripBom(inline);
  }

  const filePath =
    process.env.GOOGLE_SERVICE_ACCOUNT_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (filePath && existsSync(filePath)) {
    try {
      return stripBom(readFileSync(filePath, "utf8")).trim();
    } catch {
      return null;
    }
  }

  return null;
}

export function getGoogleSheetsCredentialsStatus(): GoogleSheetsCredentialsStatus {
  const raw = getRawServiceAccountJsonString();
  if (!raw) return "missing";
  try {
    JSON.parse(raw);
    return "ok";
  } catch {
    return "invalid";
  }
}

export function isGoogleSheetsConfigured(): boolean {
  return getGoogleSheetsCredentialsStatus() === "ok";
}

function getSheetsClient() {
  const raw = getRawServiceAccountJsonString();
  if (!raw) {
    throw new Error(
      "Ключ сервисного аккаунта не найден: задайте GOOGLE_SERVICE_ACCOUNT_JSON (лучше одной строкой), GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 или путь к файлу в GOOGLE_SERVICE_ACCOUNT_PATH / GOOGLE_APPLICATION_CREDENTIALS"
    );
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

function escapeSheetTitle(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

/**
 * Читает первый лист таблицы (или лист с указанным названием) как массив строк.
 * Первая строка — заголовки для импорта.
 */
export async function readSpreadsheetAsAoA(
  spreadsheetId: string,
  sheetTitle?: string | null
): Promise<{ sheetTitle: string; values: (string | number | boolean | null)[][] }> {
  const sheets = getSheetsClient();
  let title = sheetTitle?.trim() || null;
  if (!title) {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const first = meta.data.sheets?.[0]?.properties?.title;
    if (!first) {
      throw new Error("В таблице нет листов");
    }
    title = first;
  }

  const range = `${escapeSheetTitle(title)}!A:ZZ`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range
  });

  const raw = res.data.values ?? [];
  const values: (string | number | boolean | null)[][] = raw.map((row) =>
    row.map((cell) => {
      if (cell == null || cell === "") return null;
      if (typeof cell === "number" || typeof cell === "boolean") return cell;
      return String(cell);
    })
  );

  while (values.length > 0) {
    const last = values[values.length - 1];
    if (!last || last.every((c) => c == null || String(c).trim() === "")) {
      values.pop();
    } else break;
  }

  return { sheetTitle: title, values };
}

/** ID таблицы из `PsychologistProfile.settingsJson.googleSheets.spreadsheetId`. */
export function getSpreadsheetIdFromProfileSettings(settingsJson: unknown): string | null {
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
