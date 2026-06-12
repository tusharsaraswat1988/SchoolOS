import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "./auth-context";
import { validateRequestAccess } from "./authorize-access";
import { isAuthOnlyPath, isPublicPath } from "./require-auth";
import { resolveRoutePermissions, routePermissionSatisfied } from "./route-permissions";

export async function authorizeRequest(req: Request, res: Response, next: NextFunction) {
  if (isPublicPath(req.path) || isAuthOnlyPath(req.path)) {
    return next();
  }

  const authReq = req as AuthenticatedRequest;
  if (!authReq.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const decision = await validateRequestAccess(
    req.method,
    req.path,
    req.params as Record<string, string>,
    authReq.auth.scope,
  );
  if (!decision.allowed) {
    return res.status(403).json({ error: decision.reason });
  }

  const requiredPermissions = resolveRoutePermissions(req.method, req.path);
  if (
    requiredPermissions &&
    !routePermissionSatisfied(authReq.auth.permissions, requiredPermissions)
  ) {
    return res.status(403).json({ error: "Forbidden" });
  }

  return next();
}

export function authorizeRequestHandler(req: Request, res: Response, next: NextFunction) {
  void authorizeRequest(req, res, next);
}
