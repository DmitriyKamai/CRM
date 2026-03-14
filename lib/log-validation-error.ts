import type { z } from "zod";

/**
 * Пишет в консоль сервера подробности ошибки валидации Zod:
 * - заголовок (например, путь API),
 * - по каждому issue: путь в данных и сообщение об ошибке,
 * - полный JSON issues для копирования.
 */
export function logZodError(prefix: string, err: z.ZodError): void {
  console.error(`[${prefix}] Ошибка валидации Zod`);
  err.issues.forEach((issue, i) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(корень)";
    console.error(`  [${i + 1}] Поле: ${path} — ${issue.message}`);
  });
  console.error(`[${prefix}] Полный список issues (JSON):`, JSON.stringify(err.issues, null, 2));
}
