import type { Request } from "express";

export function getBearerUserId(req: Request): number | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);
  if (!token.startsWith("token-")) return null;
  const userId = Number(token.slice("token-".length));
  return Number.isFinite(userId) ? userId : null;
}
