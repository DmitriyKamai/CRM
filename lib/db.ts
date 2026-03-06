import { PrismaClient } from "@prisma/client";

// В Next.js dev-режиме модули пересобираются, поэтому
// используем глобальную переменную, чтобы не плодить клиентов.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function datasourceUrlWithPoolLimit(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  // Добавляем connection_limit только если в URL его ещё нет (для Neon оставляем значение из .env).
  if (/[?&]connection_limit=/.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}connection_limit=10`;
}

const datasourceUrl = datasourceUrlWithPoolLimit();
const prismaOptions: ConstructorParameters<typeof PrismaClient>[0] = {
  log: ["error", "warn"]
};
if (datasourceUrl) {
  prismaOptions.datasourceUrl = datasourceUrl;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

