/**
 * Serializes API handlers that use Prisma to avoid process crash when multiple
 * requests run Prisma concurrently (e.g. dashboard + slots, or Strict Mode double fetch).
 */
let lock: Promise<void> = Promise.resolve();

export async function withPrismaLock<T>(fn: () => Promise<T>): Promise<T> {
  const wait = lock;
  let release!: () => void;
  lock = new Promise((r) => {
    release = r;
  });
  await wait;
  try {
    return await fn();
  } finally {
    release();
  }
}
