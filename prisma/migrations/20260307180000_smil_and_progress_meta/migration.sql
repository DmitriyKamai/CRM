-- AlterEnum
ALTER TYPE "TestType" ADD VALUE 'SMIL';

-- AlterTable (meta for SMIL variant/gender/age)
ALTER TABLE "DiagnosticProgress" ADD COLUMN IF NOT EXISTS "meta" JSONB;
