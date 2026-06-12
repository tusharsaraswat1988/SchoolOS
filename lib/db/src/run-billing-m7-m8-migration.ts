import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

config({ path: path.resolve(import.meta.dirname, "../../../.env") });

const migrationPath = path.resolve(import.meta.dirname, "../drizzle/0009_billing_m7_m8_invoices.sql");
const sql = fs.readFileSync(migrationPath, "utf8");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(sql);
  console.log("Applied migration: 0009_billing_m7_m8_invoices.sql");
} finally {
  await pool.end();
}
