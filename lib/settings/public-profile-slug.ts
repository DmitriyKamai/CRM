/**
 * Зарезервированные адреса (точное совпадение).
 * Плюс проверка префиксов служебных сегментов — см. `reservedRoutePrefixConflict`.
 */
const RESERVED_SLUGS_EXACT = new Set([
  "api",
  "auth",
  "admin",
  "settings",
  "login",
  "register",
  "logout",
  "signin",
  "signout",
  "static",
  "psychologists",
  "catalog",
  "client",
  "psychologist",
  "diagnostics",
  "new",
  "_next",
  "opengraph-image",
  "favicon",
  "icon",
  "robots",
  "sitemap",
  "manifest",
  "well-known",
  "id",
  "null",
  "undefined",
  "true",
  "false",
  "internal",
  "private",
  "public",
  "www",
  "ftp",
  "cdn",
  "assets",
  "files",
  "uploads",
  "status",
  "health",
  "billing",
  "docs",
  "help",
  "support",
  "blog",
  "ingest",
  "trace"
]);

/**
 * Корневые сегменты приложения и похожие на них пути: нельзя `segment` и `segment-…`
 * (имитация вложенных маршрутов).
 */
const RESERVED_ROUTE_PREFIX_ROOTS = [
  "admin",
  "auth",
  "api",
  "client",
  "settings",
  "psychologist",
  "psychologists",
  "catalog",
  "diagnostics",
  "static",
  "_next",
  "new"
] as const;

const MAX_SLUG_LENGTH = 32;
const MIN_SLUG_LENGTH = 3;

/**
 * Приводит ввод к нижнему регистру, заменяет пробелы и подчёркивания на дефис,
 * удаляет недопустимые символы.
 * Завершающий дефис не обрезаем — иначе при вводе «ivan-» он исчезает до следующей буквы;
 * финальная проверка — в `validatePublicSlug`.
 */
export function normalizePublicSlugInput(raw: string): string {
  let s = raw.trim().toLowerCase().replace(/[\s_]+/g, "-");
  s = s.replace(/[^a-z0-9-]/g, "");
  s = s.replace(/-+/g, "-");
  s = s.replace(/^-+/, "");
  if (s.length > MAX_SLUG_LENGTH) {
    s = s.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "");
  }
  return s;
}

export type PublicSlugValidation =
  | { ok: true; slug: string }
  | { ok: false; message: string };

function reservedRoutePrefixConflict(normalized: string): boolean {
  for (const root of RESERVED_ROUTE_PREFIX_ROOTS) {
    if (normalized === root || normalized.startsWith(`${root}-`)) {
      return true;
    }
  }
  return false;
}

/**
 * Проверка после normalizePublicSlugInput: 3–32 символа, латиница/цифры/дефис,
 * с буквы, не начинается с «id», не зарезервировано и не похоже на служебный путь.
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
  if (normalized.startsWith("id")) {
    return {
      ok: false,
      message:
        "Адрес не может начинаться с «id» — так похоже на технический идентификатор. Например: emma-smith, my-therapy."
    };
  }
  if (RESERVED_SLUGS_EXACT.has(normalized)) {
    return { ok: false, message: "Такой адрес зарезервирован системой." };
  }
  if (reservedRoutePrefixConflict(normalized)) {
    return {
      ok: false,
      message:
        "Этот адрес совпадает со служебным разделом сайта или похож на него. Выберите другой."
    };
  }
  return { ok: true, slug: normalized };
}
