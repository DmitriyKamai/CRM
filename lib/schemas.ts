import { z } from "zod";

const isoDateString = z.string().refine(val => !Number.isNaN(Date.parse(val)), {
  message: "Неверный формат даты"
});

export const createSlotSchema = z.object({
  start: isoDateString,
  durationMinutes: z.number().int().positive().optional().default(50)
});

export const updateSlotSchema = z.object({
  status: z.enum(["FREE", "BOOKED", "CANCELED"]).optional(),
  start: isoDateString.optional(),
  durationMinutes: z.number().int().positive().optional()
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["CLIENT", "PSYCHOLOGIST", "ADMIN"], {
    errorMap: () => ({ message: "Неверная роль" })
  })
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Укажите текущий пароль"),
  newPassword: z
    .string()
    .min(8, "Новый пароль не менее 8 символов")
    .regex(/[A-Za-zА-Яа-я]/, "Новый пароль должен содержать буквы")
    .regex(/\d/, "Новый пароль должен содержать цифры")
    .regex(
      /[^A-Za-zА-Яа-я0-9\s]/,
      "Добавьте в новый пароль специальный символ (например, !, ?, %)"
    )
});
