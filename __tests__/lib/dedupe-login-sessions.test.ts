import { describe, expect, it } from "vitest";

import {
  dedupeLoginSessionsForDisplay,
  type LoginSessionListRow
} from "@/lib/auth-login-session";

function baseRow(
  overrides: Partial<LoginSessionListRow> &
    Pick<LoginSessionListRow, "sessionKey" | "createdAt" | "lastSeenAt">
): LoginSessionListRow {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    sessionKey: overrides.sessionKey,
    userAgent: overrides.userAgent ?? null,
    browser: overrides.browser ?? "Chrome 120",
    os: overrides.os ?? "Windows 10",
    deviceLabel: overrides.deviceLabel ?? "Chrome 120 · Windows 10",
    country: overrides.country ?? "BY",
    city: overrides.city ?? "Minsk",
    createdAt: overrides.createdAt,
    lastSeenAt: overrides.lastSeenAt
  };
}

describe("dedupeLoginSessionsForDisplay", () => {
  it("не схлопывает записи с тем же отпечатком, если разница createdAt > 2 мин", () => {
    const t0 = new Date("2026-03-31T10:00:00Z");
    const tFar = new Date("2026-03-31T10:10:00Z");
    const rows = [
      baseRow({ sessionKey: "a", createdAt: t0, lastSeenAt: t0 }),
      baseRow({
        sessionKey: "b",
        id: "id-b",
        createdAt: tFar,
        lastSeenAt: tFar
      })
    ];
    const out = dedupeLoginSessionsForDisplay(rows, null);
    expect(out).toHaveLength(2);
  });

  it("схлопывает кластер в пределах 2 минут", () => {
    const t0 = new Date("2026-03-31T10:00:00Z");
    const t1 = new Date("2026-03-31T10:00:30Z");
    const rows = [
      baseRow({ sessionKey: "a", createdAt: t0, lastSeenAt: t0 }),
      baseRow({
        sessionKey: "b",
        id: "id-b",
        createdAt: t1,
        lastSeenAt: t1
      })
    ];
    const out = dedupeLoginSessionsForDisplay(rows, null);
    expect(out).toHaveLength(1);
    expect(out[0]!.sessionKey).toBe("b");
  });

  it("приоритет текущей сессии в кластере", () => {
    const t0 = new Date("2026-03-31T10:00:00Z");
    const t1 = new Date("2026-03-31T10:00:20Z");
    const rows = [
      baseRow({
        sessionKey: "older",
        id: "1",
        createdAt: t0,
        lastSeenAt: t0
      }),
      baseRow({
        sessionKey: "current",
        id: "2",
        createdAt: t1,
        lastSeenAt: t1
      })
    ];
    const out = dedupeLoginSessionsForDisplay(rows, "older");
    expect(out).toHaveLength(1);
    expect(out[0]!.sessionKey).toBe("older");
  });
});
