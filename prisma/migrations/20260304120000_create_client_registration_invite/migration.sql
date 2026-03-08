-- CreateTable (таблица могла быть создана ранее через db push; IF NOT EXISTS для безопасности)
CREATE TABLE IF NOT EXISTS "ClientRegistrationInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "psychologistId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "ClientRegistrationInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ClientRegistrationInvite_token_key" ON "ClientRegistrationInvite"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClientRegistrationInvite_clientId_idx" ON "ClientRegistrationInvite"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClientRegistrationInvite_psychologistId_idx" ON "ClientRegistrationInvite"("psychologistId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClientRegistrationInvite_clientId_fkey') THEN
    ALTER TABLE "ClientRegistrationInvite" ADD CONSTRAINT "ClientRegistrationInvite_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClientRegistrationInvite_psychologistId_fkey') THEN
    ALTER TABLE "ClientRegistrationInvite" ADD CONSTRAINT "ClientRegistrationInvite_psychologistId_fkey"
      FOREIGN KEY ("psychologistId") REFERENCES "PsychologistProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
