-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL,
    "schedulingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "diagnosticsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "PlatformSettings" ("id", "schedulingEnabled", "diagnosticsEnabled", "updatedAt")
VALUES ('default', true, true, CURRENT_TIMESTAMP);
