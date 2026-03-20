/**
 * Удаляет `node_modules/.prisma` перед `prisma generate`.
 * На Windows помогает при EPERM при переименовании query_engine-*.dll.node
 * (файл часто держит запущенный Node / dev-сервер).
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const prismaDir = path.join(__dirname, "..", "node_modules", ".prisma");

try {
  if (fs.existsSync(prismaDir)) {
    fs.rmSync(prismaDir, { recursive: true, force: true });
    console.log("[clean-prisma-engine] removed:", prismaDir);
  } else {
    console.log("[clean-prisma-engine] skip (not found):", prismaDir);
  }
} catch (e) {
  console.error("[clean-prisma-engine] failed:", e?.message ?? e);
  process.exit(1);
}
