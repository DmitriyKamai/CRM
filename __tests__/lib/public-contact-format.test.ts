import { describe, expect, it } from "vitest";

import {
  formatTelegramForDisplay,
  normalizePhoneForCopy
} from "@/lib/public-contact-format";

describe("formatTelegramForDisplay", () => {
  it("преобразует https://t.me/user в @user", () => {
    expect(formatTelegramForDisplay("https://t.me/k_dmitriy_1")).toBe(
      "@k_dmitriy_1"
    );
  });

  it("сохраняет @user", () => {
    expect(formatTelegramForDisplay("@ivan")).toBe("@ivan");
  });

  it("добавляет @ к username без префикса", () => {
    expect(formatTelegramForDisplay("ivan_petrov")).toBe("@ivan_petrov");
  });
});

describe("normalizePhoneForCopy", () => {
  it("оставляет цифры и ведущий плюс", () => {
    expect(normalizePhoneForCopy("+375 29 123-45-67")).toBe(
      "+375291234567"
    );
  });
});
