/**
 * Drops all public schema objects so Phase 0 drizzle push runs non-interactively.
 * WARNING: destructive — dev/staging only.
 */
import { config as loadDotenv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { spawnSync } from "node:child_process";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadDotenv({ path: path.join(rootDir, ".env") });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  console.log("Dropping public schema objects...");
  await pool.query(`
    DO $$ DECLARE r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
      FOR r IN (SELECT typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                WHERE n.nspname = 'public' AND t.typtype = 'e') LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
      END LOOP;
    END $$;
  `);
  console.log("Public schema cleared.");

  console.log("Running drizzle-kit push...");
  const push = spawnSync(
    "pnpm",
    ["exec", "drizzle-kit", "push", "--force", "--config", "./drizzle.config.ts"],
    { cwd: path.join(rootDir, "lib/db"), stdio: "inherit", shell: true },
  );
  if (push.status !== 0) {
    process.exit(push.status ?? 1);
  }
  console.log("Schema push complete.");
} catch (error) {
  console.error("db-reset-phase0 failed:", error);
  process.exit(1);
} finally {
  await pool.end();
}
