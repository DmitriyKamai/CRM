-- CreateTable
CREATE TABLE "DiagnosticProgress" (
    "id" TEXT NOT NULL,
    "diagnosticLinkId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticProgress_diagnosticLinkId_key" ON "DiagnosticProgress"("diagnosticLinkId");

-- AddForeignKey
ALTER TABLE "DiagnosticProgress" ADD CONSTRAINT "DiagnosticProgress_diagnosticLinkId_fkey" FOREIGN KEY ("diagnosticLinkId") REFERENCES "DiagnosticLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
