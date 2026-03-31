-- CreateTable
CREATE TABLE "AuthLoginSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "userAgent" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "deviceLabel" TEXT,
    "country" TEXT,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "AuthLoginSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthLoginSession_sessionKey_key" ON "AuthLoginSession"("sessionKey");

-- CreateIndex
CREATE INDEX "AuthLoginSession_userId_idx" ON "AuthLoginSession"("userId");

-- CreateIndex
CREATE INDEX "AuthLoginSession_userId_revokedAt_idx" ON "AuthLoginSession"("userId", "revokedAt");

-- AddForeignKey
ALTER TABLE "AuthLoginSession" ADD CONSTRAINT "AuthLoginSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
