-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "proposedByPsychologist" BOOLEAN NOT NULL DEFAULT false;

-- Migrate existing data from notes hack
UPDATE "Appointment" SET "proposedByPsychologist" = true WHERE notes LIKE '%PROPOSED_BY_PSYCHOLOGIST%';

-- Clean up the hack marker from notes
UPDATE "Appointment" SET notes = NULL WHERE notes = 'PROPOSED_BY_PSYCHOLOGIST';
