-- AlterTable
ALTER TABLE "User" ADD COLUMN "telegramChatId" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramUsername" TEXT;

-- CreateTable
CREATE TABLE "TelegramLinkToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLinkToken_token_key" ON "TelegramLinkToken"("token");

-- CreateIndex
CREATE INDEX "TelegramLinkToken_token_idx" ON "TelegramLinkToken"("token");

-- CreateIndex
CREATE INDEX "TelegramLinkToken_expiresAt_idx" ON "TelegramLinkToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "TelegramLinkToken" ADD CONSTRAINT "TelegramLinkToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
