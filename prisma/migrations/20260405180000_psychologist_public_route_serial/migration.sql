-- Порядковый публичный номер психолога: канонический URL /id1, /id2, …

ALTER TABLE "PsychologistProfile" ADD COLUMN "publicRouteSerial" INTEGER;

UPDATE "PsychologistProfile" AS p
SET "publicRouteSerial" = sub.n
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) AS n
  FROM "PsychologistProfile"
) AS sub
WHERE p.id = sub.id;

ALTER TABLE "PsychologistProfile" ALTER COLUMN "publicRouteSerial" SET NOT NULL;

CREATE UNIQUE INDEX "PsychologistProfile_publicRouteSerial_key" ON "PsychologistProfile"("publicRouteSerial");
