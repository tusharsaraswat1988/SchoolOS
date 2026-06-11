import type { NextFunction, Request, Response } from "express";
import { getBearerUserId } from "./auth-token";
import { loadAuthSession } from "./auth-helpers";
import type { AuthenticatedRequest } from "./auth-context";

const PUBLIC_PATHS = new Set([
  "/healthz",
  "/auth/captcha",
  "/auth/login",
  "/auth/password/forgot",
]);

const AUTH_ONLY_PATHS = new Set(["/auth/logout", "/auth/me"]);

export function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.has(path);
}

export function isAuthOnlyPath(path: string): boolean {
  return AUTH_ONLY_PATHS.has(path);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (isPublicPath(req.path)) {
    return next();
  }

  const userId = getBearerUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const session = await loadAuthSession(userId);
  if (!session || session.user.status !== "active") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  (req as AuthenticatedRequest).auth = {
    userId,
    user: session.user,
    permissions: session.permissions,
    scope: {
      role: session.user.role,
      roleScope: session.user.roleScope,
      societyId: session.user.societyId,
      schoolId: session.user.schoolId,
      branchId: session.user.branchId,
      sessionId: session.user.sessionId,
      studentId: session.user.studentId,
    },
  };

  return next();
}

export function requireAuthHandler(req: Request, res: Response, next: NextFunction) {
  void requireAuth(req, res, next);
}
