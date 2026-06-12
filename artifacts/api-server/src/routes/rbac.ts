import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../lib/auth-context";
import { hasPermission } from "../lib/effective-permissions";
import { writeRbacAudit } from "../lib/rbac-audit";
import {
  countUsersByRole,
  getRolePermissionKeys,
  getUserRestrictions,
  listBranchUsers,
  listPermissionsCatalog,
  listRbacAuditEvents,
  listRoles,
  setRolePermissionKeys,
  setUserSectionRestrictions,
  updateUserRole,
} from "../lib/rbac-service";
import { resolveBranchScope } from "../lib/scope";

const router = Router();

function asAuth(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}

function requirePermissionsManage(req: AuthenticatedRequest, res: Response): boolean {
  if (
    !hasPermission(req.auth.permissions, "permissions.manage") &&
    !hasPermission(req.auth.permissions, "platform.full_access")
  ) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

router.get("/platform/access-control/overview", async (req, res) => {
  const r = asAuth(req);
  if (!requirePermissionsManage(r, res)) return;

  const roles = await listRoles();
  const [permissions, roleMatrix, auditEvents] = await Promise.all([
    listPermissionsCatalog(),
    Promise.all(
      roles.map(async (role) => ({
        roleKey: role.key,
        roleName: role.name,
        scope: role.scope,
        permissions: await getRolePermissionKeys(role.key),
      })),
    ),
    listRbacAuditEvents({ limit: 25 }),
  ]);

  return res.json({ roles, permissions, roleMatrix, auditEvents });
});

const UpdateRolePermissionsBody = z.object({
  permissionKeys: z.array(z.string()),
});

router.get("/platform/access-control/roles/:roleKey/permissions", async (req, res) => {
  const r = asAuth(req);
  if (!requirePermissionsManage(r, res)) return;
  const keys = await getRolePermissionKeys(req.params.roleKey);
  return res.json({ roleKey: req.params.roleKey, permissionKeys: keys });
});

router.put("/platform/access-control/roles/:roleKey/permissions", async (req, res) => {
  const r = asAuth(req);
  if (!requirePermissionsManage(r, res)) return;

  const parsed = UpdateRolePermissionsBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const { previousKeys, nextKeys } = await setRolePermissionKeys(
    req.params.roleKey,
    parsed.data.permissionKeys,
    r.auth.userId,
  );

  await writeRbacAudit({
    req: r,
    action: "permission_changed",
    entityType: "role",
    entityId: req.params.roleKey,
    entityLabel: req.params.roleKey,
    oldValue: { permissionKeys: previousKeys },
    newValue: { permissionKeys: nextKeys },
    metadata: { scope: "platform" },
  });

  return res.json({ roleKey: req.params.roleKey, permissionKeys: nextKeys });
});

router.get("/schools/:schoolId/access-control/overview", async (req, res) => {
  const r = asAuth(req);
  if (!requirePermissionsManage(r, res)) return;

  const schoolId = Number(req.params.schoolId);
  const roles = await listRoles();
  const staffRoles = roles.filter((role) =>
    ["teacher", "principal", "coordinator", "accountant", "school_admin"].includes(role.key),
  );

  const [permissions, usersByRole, roleMatrix] = await Promise.all([
    listPermissionsCatalog(),
    countUsersByRole(schoolId),
    Promise.all(
      staffRoles.map(async (role) => ({
        roleKey: role.key,
        roleName: role.name,
        permissions: await getRolePermissionKeys(role.key),
      })),
    ),
  ]);

  return res.json({ roles: staffRoles, permissions, usersByRole, roleMatrix });
});

router.get("/branches/:branchId/access-control/users", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const scope = await resolveBranchScope(branchId);
  if (!scope) return res.status(404).json({ error: "Branch not found" });

  const role = req.query.role as string | undefined;
  const users = await listBranchUsers(branchId, role);
  return res.json({ data: users, total: users.length });
});

router.get("/branches/:branchId/access-control/users/:userId/restrictions", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const scope = await resolveBranchScope(branchId);
  if (!scope) return res.status(404).json({ error: "Branch not found" });

  const userId = Number(req.params.userId);
  const restrictions = await getUserRestrictions(userId);
  return res.json({ userId, restrictions });
});

const UpdateUserRoleBody = z.object({ roleKey: z.string().min(1) });

router.patch("/branches/:branchId/access-control/users/:userId/role", async (req, res) => {
  const r = asAuth(req);
  if (!requirePermissionsManage(r, res)) return;

  const parsed = UpdateUserRoleBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const branchId = Number(req.params.branchId);
  const userId = Number(req.params.userId);
  try {
    const user = await updateUserRole(userId, parsed.data.roleKey, branchId);
    await writeRbacAudit({
      req: r,
      action: "user_updated",
      entityType: "user",
      entityId: String(userId),
      entityLabel: user.name,
      newValue: { roleKey: parsed.data.roleKey },
      metadata: { branchId },
    });
    return res.json({ userId, roleKey: parsed.data.roleKey });
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : "Update failed" });
  }
});

const UpdateRestrictionsBody = z.object({
  sectionIds: z.array(z.number().int().positive()),
});

router.put("/branches/:branchId/access-control/users/:userId/restrictions", async (req, res) => {
  const r = asAuth(req);
  if (!requirePermissionsManage(r, res)) return;

  const parsed = UpdateRestrictionsBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const userId = Number(req.params.userId);
  const restrictions = await setUserSectionRestrictions(userId, parsed.data.sectionIds);

  await writeRbacAudit({
    req: r,
    action: "permission_changed",
    entityType: "user_restrictions",
    entityId: String(userId),
    newValue: { sectionIds: parsed.data.sectionIds },
    metadata: { branchId: Number(req.params.branchId) },
  });

  return res.json({ userId, restrictions });
});

router.get("/schools/:schoolId/access-control/audit", async (req, res) => {
  const r = asAuth(req);
  if (!requirePermissionsManage(r, res)) return;

  const schoolId = Number(req.params.schoolId);
  const events = await listRbacAuditEvents({ schoolId, limit: 50 });
  return res.json({ data: events });
});

export default router;
