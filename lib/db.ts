import { PrismaClient } from "@prisma/client";

// В Next.js dev-режиме модули пересобираются, поэтому
// используем глобальную переменную, чтобы не плодить клиентов.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Логируем только ошибки и предупреждения.
// Важно: в DATABASE_URL должен быть connection_limit=5 (или меньше при Neon/serverless),
// иначе при многих одновременных запросах пул исчерпывается и сервер падает.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

