type Counter = {
  count: number;
  expiresAt: number;
};

type Store = Map<string, Counter>;

const globalForRateLimit = globalThis as unknown as {
  __rateLimitStore?: Store;
};

const store: Store =
  globalForRateLimit.__rateLimitStore ?? new Map<string, Counter>();

if (!globalForRateLimit.__rateLimitStore) {
  globalForRateLimit.__rateLimitStore = store;
}

export interface RateLimitOptions {
  key: string;
  windowMs: number;
  max: number;
}

// Простая in-memory rate limiting по ключу (обычно IP + тип операции).
// В проде лучше использовать Redis/Upstash или иной внешне хранилище.
export function checkRateLimit(options: RateLimitOptions): boolean {
  const now = Date.now();
  const existing = store.get(options.key);

  if (!existing || existing.expiresAt < now) {
    store.set(options.key, {
      count: 1,
      expiresAt: now + options.windowMs
    });
    return true;
  }

  if (existing.count >= options.max) {
    return false;
  }

  existing.count += 1;
  store.set(options.key, existing);
  return true;
}

