import type { Prisma } from "@prisma/client";

/**
 * Следующий порядковый номер для нового профиля психолога (внутри транзакции).
 */
export async function allocatePublicRouteSerial(
  tx: Prisma.TransactionClient
): Promise<number> {
  const { _max } = await tx.psychologistProfile.aggregate({
    _max: { publicRouteSerial: true }
  });
  return (_max.publicRouteSerial ?? 0) + 1;
}

/**
 * Разбор сегмента URL вида `id1`, `id42` (регистр не важен).
 */
export function parsePublicRouteSerialFromSegment(segment: string): number | null {
  const s = segment.trim().toLowerCase();
  const m = /^id(\d+)$/.exec(s);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}
