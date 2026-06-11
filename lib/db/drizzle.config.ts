import { config as loadDotenv } from "dotenv";
import { defineConfig } from "drizzle-kit";
import path from "path";

loadDotenv({ path: path.resolve(process.cwd(), "../../.env") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  // Phase 0 authoritative schema barrel.
  schema: "./src/schema/*.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
