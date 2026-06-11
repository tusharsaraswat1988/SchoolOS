import { config } from "dotenv";
import pg from "pg";
import path from "path";

config({ path: path.resolve(import.meta.dirname, "../../../.env") });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

await pool.query(
  "UPDATE students SET parent_email = 'unknown@schoolos.local' WHERE parent_email IS NULL OR parent_email = ''",
);
await pool.query("ALTER TABLE students ALTER COLUMN parent_email SET NOT NULL");
console.log("UDISE Phase-1 migration applied: students.parent_email NOT NULL");
await pool.end();
