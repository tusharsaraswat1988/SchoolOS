import { config as loadDotenv } from "dotenv";
import path from "node:path";

loadDotenv({ path: path.resolve(process.cwd(), "../../.env") });

async function main() {
  const { seedPhase0Foundation } = await import("./seed-phase0-foundation");
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await seedPhase0Foundation();
      console.log("Phase 0 foundation seed completed.");
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryable =
        message.includes("Connection terminated") ||
        message.includes("ECONNRESET") ||
        message.includes("connection timeout");
      if (!retryable || attempt === maxAttempts) throw error;
      console.warn(`Seed attempt ${attempt} failed (${message}). Retrying in 3s...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

main().catch((error) => {
  console.error("Phase 0 foundation seed failed:", error);
  process.exit(1);
});
