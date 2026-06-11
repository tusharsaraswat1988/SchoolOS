import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LEN = 64;

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(plain, salt, KEY_LEN)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export const DEFAULT_DEV_PASSWORD = "SchoolOS@123";

export function formatUserCode(prefix: string, n: number, pad = 4): string {
  return `${prefix}${String(n).padStart(pad, "0")}`;
}
