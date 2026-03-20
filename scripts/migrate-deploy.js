/**
 * Runs Prisma migrations using the direct DB URL (required for Neon).
 * Prisma uses advisory locks that often time out (P1002) on Neon;
 * we disable advisory lock for deploy to avoid that (single deploy at a time).
 *
 * Set DIRECT_DATABASE_URL to the *direct* connection string (no -pooler in host).
 */
(async () => {
  // Dynamic import to avoid `require()` (eslint rule `@typescript-eslint/no-require-imports`)
  const childProcessMod = await import("child_process");
  const execSync =
    childProcessMod.execSync ?? (childProcessMod.default && childProcessMod.default.execSync);

  // Для npm-скриптов Node не всегда подхватывает `.env`, поэтому явно грузим dotenv.
  try {
    const dotenvMod = await import("dotenv");
    dotenvMod.config();
  } catch {
    // ignore (dotenv не критичен)
  }

  if (!process.env.DIRECT_DATABASE_URL) {
    if (process.env.DATABASE_URL) {
      console.warn(
        "[migrate-deploy] DIRECT_DATABASE_URL is not set; using DATABASE_URL for migrate deploy."
      );
      console.warn(
        "  For Neon in production, prefer DIRECT_DATABASE_URL (non-pooler host) to avoid timeouts."
      );
    } else {
      console.error(
        "[migrate-deploy] Set DATABASE_URL, or for Neon also set DIRECT_DATABASE_URL (direct host)."
      );
      process.exit(1);
    }
  }

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: {
      ...process.env,
      // Avoid P1002 timeout on Neon; only one deploy runs at a time
      PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: "1"
    }
  });
})().catch((e) => {
  console.error("Fatal error:", e?.message ?? e);
  process.exit(1);
});
