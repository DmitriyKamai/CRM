-- Baseline: уникальное ограничение уже применено через db push (запись для истории).
ALTER TABLE "ClientRegistrationInvite" ADD CONSTRAINT "ClientRegistrationInvite_clientId_psychologistId_key" UNIQUE ("clientId", "psychologistId");
