import { describe, it, expect } from "vitest";
import { z } from "zod";

/**
 * Тестируем схему валидации регистрации, воспроизводя её из app/api/auth/register/route.ts.
 * Валидация вынесена сюда для юнит-тестирования без запуска Next.js.
 */
const registerSchema = z.object({
  role: z.enum(["psychologist", "client"]),
  email: z
    .string()
    .trim()
    .email("Некорректный email")
    .max(64, "Слишком длинный email"),
  password: z
    .string()
    .min(8, "Минимум 8 символов")
    .regex(/[A-Za-zА-Яа-я]/, "Пароль должен содержать буквы")
    .regex(/\d/, "Пароль должен содержать цифры")
    .regex(/[^A-Za-zА-Яа-я0-9\s]/, "Добавьте специальный символ"),
  firstName: z
    .string()
    .trim()
    .min(2, "Имя не короче 2 символов")
    .max(32, "Имя слишком длинное"),
  lastName: z
    .string()
    .trim()
    .min(2, "Фамилия не короче 2 символов")
    .max(32, "Фамилия слишком длинная")
});

describe("registerSchema", () => {
  const validData = {
    role: "psychologist" as const,
    email: "test@example.com",
    password: "Abc12345!",
    firstName: "Иван",
    lastName: "Петров"
  };

  it("принимает корректные данные психолога", () => {
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("принимает корректные данные клиента", () => {
    const result = registerSchema.safeParse({ ...validData, role: "client" });
    expect(result.success).toBe(true);
  });

  it("отклоняет неверную роль", () => {
    const result = registerSchema.safeParse({ ...validData, role: "admin" });
    expect(result.success).toBe(false);
  });

  it("отклоняет некорректный email", () => {
    const result = registerSchema.safeParse({ ...validData, email: "not-email" });
    expect(result.success).toBe(false);
  });

  it("отклоняет слишком длинный email (>64 символов)", () => {
    const longEmail = "a".repeat(60) + "@test.com";
    const result = registerSchema.safeParse({ ...validData, email: longEmail });
    expect(result.success).toBe(false);
  });

  it("отклоняет пароль короче 8 символов", () => {
    const result = registerSchema.safeParse({ ...validData, password: "Ab1!" });
    expect(result.success).toBe(false);
  });

  it("отклоняет пароль без букв", () => {
    const result = registerSchema.safeParse({ ...validData, password: "12345678!" });
    expect(result.success).toBe(false);
  });

  it("отклоняет пароль без цифр", () => {
    const result = registerSchema.safeParse({ ...validData, password: "Abcdefgh!" });
    expect(result.success).toBe(false);
  });

  it("отклоняет пароль без спецсимволов", () => {
    const result = registerSchema.safeParse({ ...validData, password: "Abcdefg1" });
    expect(result.success).toBe(false);
  });

  it("принимает пароль с кириллическими буквами", () => {
    const result = registerSchema.safeParse({ ...validData, password: "Парольчик1!" });
    expect(result.success).toBe(true);
  });

  it("отклоняет слишком короткое имя (<2)", () => {
    const result = registerSchema.safeParse({ ...validData, firstName: "И" });
    expect(result.success).toBe(false);
  });

  it("отклоняет слишком длинное имя (>32)", () => {
    const result = registerSchema.safeParse({ ...validData, firstName: "А".repeat(33) });
    expect(result.success).toBe(false);
  });

  it("обрезает пробелы в email и имени", () => {
    const result = registerSchema.parse({
      ...validData,
      email: "  test@example.com  ",
      firstName: "  Иван  ",
      lastName: "  Петров  "
    });
    expect(result.email).toBe("test@example.com");
    expect(result.firstName).toBe("Иван");
    expect(result.lastName).toBe("Петров");
  });
});
