-- AlterTable: User.dateOfBirth (отсутствовала в миграциях, схема уже содержала поле)
DO $$
BEGIN
  ALTER TABLE "User" ADD COLUMN "dateOfBirth" TIMESTAMP(3);
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;
