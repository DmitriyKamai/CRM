-- Публичный slug, раздельная публикация страницы и каталога, блок «практика».

ALTER TABLE "PsychologistProfile" ADD COLUMN "publicSlug" TEXT;
ALTER TABLE "PsychologistProfile" ADD COLUMN "profilePagePublished" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PsychologistProfile" ADD COLUMN "catalogVisible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PsychologistProfile" ADD COLUMN "practiceCountry" TEXT;
ALTER TABLE "PsychologistProfile" ADD COLUMN "practiceCity" TEXT;
ALTER TABLE "PsychologistProfile" ADD COLUMN "worksOnline" BOOLEAN NOT NULL DEFAULT false;

UPDATE "PsychologistProfile"
SET
  "profilePagePublished" = "profilePhotoPublished",
  "catalogVisible" = "profilePhotoPublished";

ALTER TABLE "PsychologistProfile" DROP COLUMN "profilePhotoPublished";

CREATE UNIQUE INDEX "PsychologistProfile_publicSlug_key" ON "PsychologistProfile"("publicSlug");
