import { config } from "dotenv";
import pg from "pg";
import { readFileSync } from "fs";
import path from "path";

config({ path: path.resolve(import.meta.dirname, "../../../.env") });

const sql = readFileSync(
  path.resolve(import.meta.dirname, "../drizzle/0003_student_documents.sql"),
  "utf8",
);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(sql);
console.log("Migration 0003_student_documents applied");
await pool.end();
