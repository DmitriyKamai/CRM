/** Зарезервированные сегменты URL и служебные имена. */
const RESERVED_SLUGS = new Set([
  "api",
  "auth",
  "admin",
  "settings",
  "login",
  "register",
  "static",
  "psychologists",
  "client",
  "psychologist",
  "diagnostics",
  "new",
  "_next",
  "opengraph-image",
  "favicon",
  "icon",
  "robots",
  "sitemap"
]);

const MAX_SLUG_LENGTH = 32;
const MIN_SLUG_LENGTH = 3;

/**
 * Приводит ввод к нижнему регистру, заменяет пробелы и подчёркивания на дефис,
 * удаляет недопустимые символы.
 */
export function normalizePublicSlugInput(raw: string): string {
  let s = raw.trim().toLowerCase().replace(/[\s_]+/g, "-");
  s = s.replace(/[^a-z0-9-]/g, "");
  s = s.replace(/-+/g, "-");
  s = s.replace(/^-+|-+$/g, "");
  if (s.length > MAX_SLUG_LENGTH) {
    s = s.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "");
  }
  return s;
}

export type PublicSlugValidation =
  | { ok: true; slug: string }
  | { ok: false; message: string };

/**
 * Проверка после normalizePublicSlugInput: 3–32 символа, латиница/цифры/дефис,
 * с буквы, не заканчивается дефисом, не зарезервировано.
 */
export function validatePublicSlug(normalized: string): PublicSlugValidation {
  if (normalized.length < MIN_SLUG_LENGTH) {
    return {
      ok: false,
      message: `Адрес страницы — не менее ${MIN_SLUG_LENGTH} латинских символов или цифр (после нормализации).`
    };
  }
  if (normalized.length > MAX_SLUG_LENGTH) {
    return { ok: false, message: `Не длиннее ${MAX_SLUG_LENGTH} символов.` };
  }
  if (!/^[a-z][a-z0-9-]*$/.test(normalized)) {
    return {
      ok: false,
      message: "Только латиница, цифры и дефис; первый символ — буква."
    };
  }
  if (normalized.endsWith("-")) {
    return { ok: false, message: "Адрес не может заканчиваться дефисом." };
  }
  if (/--/.test(normalized)) {
    return { ok: false, message: "Не используйте два дефиса подряд." };
  }
  if (RESERVED_SLUGS.has(normalized)) {
    return { ok: false, message: "Такой адрес зарезервирован системой." };
  }
  return { ok: true, slug: normalized };
}
