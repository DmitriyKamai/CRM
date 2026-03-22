import { createHmac, timingSafeEqual } from "crypto";

import { google } from "googleapis";

/** Чтение ячеек при импорте. */
const SHEETS_READONLY_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
/**
 * Просмотр файлов в Drive — нужен для Google Picker (окно «выбрать таблицу»).
 * Без этого после выбора файла Google может отвечать 403.
 */
const DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

const SHEETS_OAUTH_SCOPES = [SHEETS_READONLY_SCOPE, DRIVE_READONLY_SCOPE];

export function getGoogleSheetsOAuthRedirectUri(): string {
  const base = process.env.NEXTAUTH_URL?.trim()?.replace(/\/$/, "");
  if (!base) {
    throw new Error("NEXTAUTH_URL не задан — нужен для redirect URI Google OAuth");
  }
  return `${base}/api/psychologist/google-sheets/oauth/callback`;
}

export function isGoogleOAuthConfiguredForSheets(): boolean {
  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  const secret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const base = process.env.NEXTAUTH_URL?.trim();
  return Boolean(id && secret && base);
}

export function createSheetsOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET обязательны");
  }
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    getGoogleSheetsOAuthRedirectUri()
  );
}

function oauthStateSecret(): string {
  return process.env.NEXTAUTH_SECRET?.trim() || "fallback-secret-change-me";
}

/** Подпись state для OAuth callback (привязка к psychologistId). */
export function signGoogleSheetsOAuthState(psychologistId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ p: psychologistId, exp: Date.now() + 10 * 60 * 1000 })
  ).toString("base64url");
  const sig = createHmac("sha256", oauthStateSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyGoogleSheetsOAuthState(state: string): string | null {
  const dot = state.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = createHmac("sha256", oauthStateSecret()).update(payload).digest("base64url");
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      p?: string;
      exp?: number;
    };
    if (typeof data.p !== "string" || typeof data.exp !== "number") return null;
    if (data.exp < Date.now()) return null;
    return data.p;
  } catch {
    return null;
  }
}

function escapeSheetTitle(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

/**
 * Читает первый лист таблицы (или лист с указанным названием) как массив строк.
 * Первая строка — заголовки для импорта. Доступ через OAuth refresh token пользователя.
 */
export async function readSpreadsheetAsAoA(
  spreadsheetId: string,
  sheetTitle: string | null | undefined,
  refreshToken: string
): Promise<{ sheetTitle: string; values: (string | number | boolean | null)[][] }> {
  const oauth2 = createSheetsOAuth2Client();
  oauth2.setCredentials({ refresh_token: refreshToken });
  const sheets = google.sheets({ version: "v4", auth: oauth2 });

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

export function buildGoogleSheetsAuthorizeUrl(psychologistId: string): string {
  const oauth2 = createSheetsOAuth2Client();
  const state = signGoogleSheetsOAuthState(psychologistId);
  return oauth2.generateAuthUrl({
    access_type: "offline",
    scope: SHEETS_OAUTH_SCOPES,
    prompt: "consent",
    include_granted_scopes: true,
    state
  });
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
