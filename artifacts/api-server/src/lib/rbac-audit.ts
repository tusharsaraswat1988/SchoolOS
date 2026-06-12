import { auditLogsTable, db } from "@workspace/db";
import type { AuthenticatedRequest } from "./auth-context";

type AuditInput = {
  req: AuthenticatedRequest;
  action: "permission_changed" | "settings_changed" | "user_updated";
  entityType: string;
  entityId: string;
  entityLabel?: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

export async function writeRbacAudit(input: AuditInput) {
  const { req, action, entityType, entityId, entityLabel, oldValue, newValue, metadata } = input;
  await db.insert(auditLogsTable).values({
    societyId: req.auth.scope.societyId,
    schoolId: req.auth.scope.schoolId,
    branchId: req.auth.scope.branchId,
    actorUserId: req.auth.userId,
    action,
    entityType,
    entityId,
    entityLabel,
    oldValue,
    newValue,
    metadata,
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? null,
  });
}
