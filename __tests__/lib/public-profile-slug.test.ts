import { describe, expect, it } from "vitest";

import {
  normalizePublicSlugInput,
  validatePublicSlug
} from "@/lib/settings/public-profile-slug";

describe("normalizePublicSlugInput", () => {
  it("оставляет завершающий дефис при наборе", () => {
    expect(normalizePublicSlugInput("ivan-")).toBe("ivan-");
  });
});

describe("validatePublicSlug", () => {
  it("принимает обычный slug", () => {
    expect(validatePublicSlug("ivan-petrov")).toEqual({ ok: true, slug: "ivan-petrov" });
  });

  it("запрещает префикс id", () => {
    const r = validatePublicSlug(normalizePublicSlugInput("id-foo"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("id");
  });

  it("запрещает ideal из-за префикса id", () => {
    const r = validatePublicSlug("ideal");
    expect(r.ok).toBe(false);
  });

  it("запрещает служебные сегменты и префиксы", () => {
    expect(validatePublicSlug("admin").ok).toBe(false);
    expect(validatePublicSlug("admin-panel").ok).toBe(false);
    expect(validatePublicSlug("client-ivan").ok).toBe(false);
    expect(validatePublicSlug("my-client").ok).toBe(true);
    expect(validatePublicSlug("catalog").ok).toBe(false);
  });
});
