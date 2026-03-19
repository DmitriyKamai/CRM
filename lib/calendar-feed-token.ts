import { randomBytes } from "crypto";

import type { PrismaClient } from "@prisma/client";

/**
 * Возвращает непрозрачный токен подписки ICS из БД; при отсутствии создаёт запись.
 * Старые ссылки на основе HMAC (`lib/calendar-feed.ts`) по-прежнему принимаются в `GET /api/calendar/feed`.
 */
export async function getOrCreateCalendarFeedToken(
  prisma: PrismaClient,
  psychologistId: string
): Promise<string> {
  const existing = await prisma.calendarFeedToken.findUnique({
    where: { psychologistId },
    select: { token: true }
  });
  if (existing) return existing.token;

  const token = randomBytes(32).toString("hex");
  try {
    const created = await prisma.calendarFeedToken.create({
      data: { psychologistId, token }
    });
    return created.token;
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e
        ? (e as { code?: string }).code
        : undefined;
    if (code === "P2002") {
      const row = await prisma.calendarFeedToken.findUnique({
        where: { psychologistId },
        select: { token: true }
      });
      if (row) return row.token;
    }
    throw e;
  }
}

/** Новый токен; прежние URL перестают работать. */
export async function rotateCalendarFeedToken(
  prisma: PrismaClient,
  psychologistId: string
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.calendarFeedToken.upsert({
    where: { psychologistId },
    create: { psychologistId, token },
    update: { token }
  });
  return token;
}
