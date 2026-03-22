-- CreateTable
CREATE TABLE "ClientHistoryEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorUserId" TEXT,
    "meta" JSONB,

    CONSTRAINT "ClientHistoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientHistoryEvent_clientId_createdAt_idx" ON "ClientHistoryEvent"("clientId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ClientHistoryEvent" ADD CONSTRAINT "ClientHistoryEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientHistoryEvent" ADD CONSTRAINT "ClientHistoryEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
