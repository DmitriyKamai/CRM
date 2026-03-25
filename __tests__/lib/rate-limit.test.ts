import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@upstash/redis", () => ({}));
vi.mock("@upstash/ratelimit", () => ({}));
vi.mock("redis", () => ({}));

describe("checkRateLimit (in-memory)", () => {
  let checkRateLimit: typeof import("@/lib/rate-limit").checkRateLimit;

  beforeEach(async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.REDIS_URL;

    vi.resetModules();
    const mod = await import("@/lib/rate-limit");
    checkRateLimit = mod.checkRateLimit;
  });

  it("разрешает запросы в пределах лимита", async () => {
    const opts = { key: "test:allow", windowMs: 60_000, max: 3 };
    expect(await checkRateLimit(opts)).toBe(true);
    expect(await checkRateLimit(opts)).toBe(true);
    expect(await checkRateLimit(opts)).toBe(true);
  });

  it("блокирует запросы после превышения лимита", async () => {
    const opts = { key: "test:block", windowMs: 60_000, max: 2 };
    expect(await checkRateLimit(opts)).toBe(true);
    expect(await checkRateLimit(opts)).toBe(true);
    expect(await checkRateLimit(opts)).toBe(false);
    expect(await checkRateLimit(opts)).toBe(false);
  });

  it("сбрасывает счётчик после истечения окна", async () => {
    vi.useFakeTimers();
    const opts = { key: "test:reset", windowMs: 1_000, max: 1 };
    expect(await checkRateLimit(opts)).toBe(true);
    expect(await checkRateLimit(opts)).toBe(false);

    vi.advanceTimersByTime(1_500);

    expect(await checkRateLimit(opts)).toBe(true);
    vi.useRealTimers();
  });

  it("разные ключи не влияют друг на друга", async () => {
    const optsA = { key: "test:a", windowMs: 60_000, max: 1 };
    const optsB = { key: "test:b", windowMs: 60_000, max: 1 };
    expect(await checkRateLimit(optsA)).toBe(true);
    expect(await checkRateLimit(optsB)).toBe(true);
    expect(await checkRateLimit(optsA)).toBe(false);
    expect(await checkRateLimit(optsB)).toBe(false);
  });
});
