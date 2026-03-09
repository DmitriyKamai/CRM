-- Set default role for new users to UNSPECIFIED (choice is made on choose-role page).
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'UNSPECIFIED';
