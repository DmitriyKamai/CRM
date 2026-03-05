/**
 * Ограничивает число одновременных запросов к Prisma (семафор).
 * Снижает пиковую нагрузку на БД и риск падения при большом числе запросов.
 */
const MAX_CONCURRENT = 1;
const TIMEOUT_MS = 25_000;

let active = 0;
const waitQueue: Array<() => void> = [];

function release(): void {
  active--;
  const next = waitQueue.shift();
  if (next) {
    active++;
    next();
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("PRISMA_TIMEOUT")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (err) => {
        clearTimeout(t);
        reject(err);
      }
    );
  });
}

export async function withPrismaLock<T>(fn: () => Promise<T>): Promise<T> {
  await new Promise<void>((resolve) => {
    if (active < MAX_CONCURRENT) {
      active++;
      resolve();
    } else {
      waitQueue.push(() => resolve());
    }
  });

  try {
    return await withTimeout(fn(), TIMEOUT_MS);
  } catch (err) {
    if (err instanceof Error && err.message === "PRISMA_TIMEOUT") {
      console.error("[withPrismaLock] Таймаут запроса к БД");
    }
    throw err;
  } finally {
    release();
  }
}
