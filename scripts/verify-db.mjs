import { config as loadDotenv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadDotenv({ path: path.join(rootDir, ".env") });

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const result = await pool.query("SELECT NOW() AS now, current_database() AS database");
  const row = result.rows[0];
  console.log(`Database connection OK`);
  console.log(`  database: ${row.database}`);
  console.log(`  server time: ${row.now}`);
  process.exit(0);
} catch (error) {
  console.error("Database connection failed:", error.message);
  process.exit(1);
} finally {
  await pool.end();
}
