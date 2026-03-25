/**
 * Тело JSON при 401 с этим `code` — клиент вызывает signOut (типично после сброса БД при живой cookie/JWT).
 */
export const SESSION_INVALID_CODE = "SESSION_INVALID" as const;
