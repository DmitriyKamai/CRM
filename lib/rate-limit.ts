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

function checkRateLimitInMemory(options: RateLimitOptions): boolean {
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

let upstashRedisInitialized = false;
let upstashRedisClient: import("@upstash/redis").Redis | null = null;
async function getUpstashRedis() {
  if (upstashRedisInitialized) return upstashRedisClient;

  upstashRedisInitialized = true;
  const url =
    process.env.UPSTASH_REDIS_REST_URL ??
    process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ??
    process.env.KV_REST_API_TOKEN;

  if (!url || !token) return null;

  // Lazy import to avoid overhead if not configured.
  const { Redis } = await import("@upstash/redis");
  upstashRedisClient = new Redis({ url, token });
  return upstashRedisClient;
}

type NodeRedisLike = {
  incr: (key: string) => Promise<number>;
  pExpire: (key: string, milliseconds: number) => Promise<number>;
};

let nodeRedisClient: NodeRedisLike | null = null;
let nodeRedisConnecting: Promise<NodeRedisLike> | null = null;

async function getNodeRedis() {
  if (nodeRedisClient) return nodeRedisClient;
  if (nodeRedisConnecting) return nodeRedisConnecting;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  const { createClient } = await import("redis");

  nodeRedisConnecting = (async () => {
    const client = createClient({ url: redisUrl });
    client.on("error", () => {
      // Avoid unhandled errors; we fall back to in-memory on failures.
    });
    await client.connect();
    nodeRedisClient = client as unknown as NodeRedisLike;
    return nodeRedisClient;
  })();

  return nodeRedisConnecting;
}

/**
 * Unified rate limiting:
 * - Prefer Upstash Redis if configured (UPSTASH_REDIS_REST_URL/TOKEN)
 * - Else try standard Redis via REDIS_URL
 * - Fallback to in-memory store (best-effort, protects against spam in dev/single instance)
 */
export async function checkRateLimit(options: RateLimitOptions) {
  try {
    const upstashRedis = await getUpstashRedis();
    if (upstashRedis) {
      // We build limiter per-call because max/window vary per endpoint.
      const { Ratelimit } = await import("@upstash/ratelimit");
      const windowSeconds = Math.max(1, Math.ceil(options.windowMs / 1000));
      const limiter = Ratelimit.fixedWindow(options.max, `${windowSeconds} s`);
      const ratelimit = new Ratelimit({ redis: upstashRedis, limiter });
      const result = await ratelimit.limit(options.key);
      return result.success;
    }

    const redis = await getNodeRedis();
    if (redis) {
      // Fixed window: INCR + set TTL on first increment.
      const current = await redis.incr(options.key);
      if (current === 1) {
        await redis.pExpire(options.key, options.windowMs);
      }
      return current <= options.max;
    }
  } catch {
    // Best-effort only: if external limiter fails, fall back to in-memory.
  }

  return checkRateLimitInMemory(options);
}

