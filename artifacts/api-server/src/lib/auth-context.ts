import type { Request } from "express";
import type { buildAuthUser } from "./auth-helpers";
import type { AuthScopePayload } from "./auth-scope";

export type AuthContext = {
  userId: number;
  user: ReturnType<typeof buildAuthUser>;
  permissions: string[];
  scope: AuthScopePayload;
};

export type AuthenticatedRequest = Request & {
  auth: AuthContext;
};

export function isAuthenticatedRequest(req: Request): req is AuthenticatedRequest {
  return "auth" in req && req.auth != null;
}
