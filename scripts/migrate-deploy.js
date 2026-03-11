/**
 * Runs Prisma migrations using the direct DB URL (required for Neon).
 * Prisma uses advisory locks that often time out (P1002) on Neon;
 * we disable advisory lock for deploy to avoid that (single deploy at a time).
 *
 * Set DIRECT_DATABASE_URL to the *direct* connection string (no -pooler in host).
 */
const { execSync } = require("child_process");

if (!process.env.DIRECT_DATABASE_URL) {
  console.error(
    "[migrate-deploy] DIRECT_DATABASE_URL is not set. Migrations need a direct connection."
  );
  console.error(
    "  For Neon: use the direct connection string (host without -pooler)."
  );
  console.error("  Add DIRECT_DATABASE_URL in your deployment environment (e.g. Vercel).");
  process.exit(1);
}

execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  env: {
    ...process.env,
    // Avoid P1002 timeout on Neon; only one deploy runs at a time
    PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: "1"
  }
});
