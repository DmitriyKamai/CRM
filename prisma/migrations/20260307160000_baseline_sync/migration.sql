-- Baseline: уникальное ограничение для ClientRegistrationInvite (идемпотентно).
DO $$
BEGIN
  ALTER TABLE "ClientRegistrationInvite"
  ADD CONSTRAINT "ClientRegistrationInvite_clientId_psychologistId_key"
  UNIQUE ("clientId", "psychologistId");
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
