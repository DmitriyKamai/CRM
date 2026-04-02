-- CreateTable: предпочтения клиента в приложении (1:1 с User)
CREATE TABLE "ClientAccountProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timezone" TEXT,
    "locale" TEXT,
    "preferredName" TEXT,
    "sessionRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "marketingEmailsOptIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientAccountProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientAccountProfile_userId_key" ON "ClientAccountProfile"("userId");

ALTER TABLE "ClientAccountProfile" ADD CONSTRAINT "ClientAccountProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
