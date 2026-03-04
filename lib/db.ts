import { PrismaClient } from "@prisma/client";

// В Next.js dev-режиме модули пересобираются, поэтому
// используем глобальную переменную, чтобы не плодить клиентов.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

