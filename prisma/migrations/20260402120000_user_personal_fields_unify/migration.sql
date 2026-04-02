-- Migration: Унификация личных полей пользователя
-- Добавляем firstName/lastName в User, переносим данные из PsychologistProfile,
-- удаляем дублирующие личные поля из PsychologistProfile.

-- Шаг 1: Добавить firstName и lastName в User
ALTER TABLE "User" ADD COLUMN "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN "lastName" TEXT;

-- Шаг 2: Перенести firstName/lastName из PsychologistProfile в User
--        Для phone/country/city/gender/maritalStatus используем COALESCE —
--        сохраняем уже имеющиеся данные в User, дополняем из PsychologistProfile если пусто.
UPDATE "User" u
SET
  "firstName"     = pp."firstName",
  "lastName"      = pp."lastName",
  "phone"         = COALESCE(u."phone", pp."phone"),
  "country"       = COALESCE(u."country", pp."country"),
  "city"          = COALESCE(u."city", pp."city"),
  "gender"        = COALESCE(u."gender", pp."gender"),
  "maritalStatus" = COALESCE(u."maritalStatus", pp."maritalStatus")
FROM "PsychologistProfile" pp
WHERE u."id" = pp."userId";

-- Шаг 3: Удалить дублирующие личные поля из PsychologistProfile
ALTER TABLE "PsychologistProfile" DROP COLUMN "firstName";
ALTER TABLE "PsychologistProfile" DROP COLUMN "lastName";
ALTER TABLE "PsychologistProfile" DROP COLUMN "phone";
ALTER TABLE "PsychologistProfile" DROP COLUMN "country";
ALTER TABLE "PsychologistProfile" DROP COLUMN "city";
ALTER TABLE "PsychologistProfile" DROP COLUMN "gender";
ALTER TABLE "PsychologistProfile" DROP COLUMN "maritalStatus";
