import {
  auditLogsTable,
  classesTable,
  db,
  permissionsTable,
  roleBranchRestrictionsTable,
  rolePermissionsTable,
  rolesTable,
  sectionsTable,
  userRoleAssignmentsTable,
  usersTable,
} from "@workspace/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

export async function listPermissionsCatalog() {
  return db
    .select({
      id: permissionsTable.id,
      key: permissionsTable.key,
      module: permissionsTable.module,
      action: permissionsTable.action,
      description: permissionsTable.description,
    })
    .from(permissionsTable)
    .where(eq(permissionsTable.status, "active"))
    .orderBy(permissionsTable.module, permissionsTable.action);
}

export async function listRoles() {
  return db
    .select({
      id: rolesTable.id,
      key: rolesTable.key,
      name: rolesTable.name,
      scope: rolesTable.scope,
      isSystem: rolesTable.isSystem,
    })
    .from(rolesTable)
    .where(eq(rolesTable.status, "active"))
    .orderBy(rolesTable.scope, rolesTable.name);
}

export async function getRolePermissionKeys(roleKey: string): Promise<string[]> {
  const rows = await db
    .select({ key: permissionsTable.key })
    .from(rolePermissionsTable)
    .innerJoin(rolesTable, eq(rolePermissionsTable.roleId, rolesTable.id))
    .innerJoin(permissionsTable, eq(rolePermissionsTable.permissionId, permissionsTable.id))
    .where(and(eq(rolesTable.key, roleKey), eq(rolePermissionsTable.isAllowed, true)));
  return rows.map((row) => row.key);
}

export async function setRolePermissionKeys(
  roleKey: string,
  permissionKeys: string[],
  actorUserId: number,
) {
  const [role] = await db.select().from(rolesTable).where(eq(rolesTable.key, roleKey)).limit(1);
  if (!role) throw new Error(`Unknown role: ${roleKey}`);

  const allPermissions = await listPermissionsCatalog();
  const permissionByKey = new Map(allPermissions.map((p) => [p.key, p.id]));
  const desiredIds = permissionKeys
    .map((key) => permissionByKey.get(key))
    .filter((id): id is number => id != null);

  const previousKeys = await getRolePermissionKeys(roleKey);

  await db.delete(rolePermissionsTable).where(eq(rolePermissionsTable.roleId, role.id));

  if (desiredIds.length > 0) {
    await db.insert(rolePermissionsTable).values(
      desiredIds.map((permissionId) => ({
        roleId: role.id,
        permissionId,
        isAllowed: true,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      })),
    );
  }

  return { previousKeys, nextKeys: permissionKeys };
}

export async function countUsersByRole(schoolId: number) {
  const rows = await db
    .select({
      roleKey: rolesTable.key,
      roleName: rolesTable.name,
      total: sql<number>`count(*)`,
    })
    .from(usersTable)
    .innerJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
    .where(and(eq(usersTable.schoolId, schoolId), eq(usersTable.status, "active")))
    .groupBy(rolesTable.key, rolesTable.name);
  return rows.map((row) => ({
    roleKey: row.roleKey,
    roleName: row.roleName,
    total: Number(row.total),
  }));
}

export async function listBranchUsers(branchId: number, roleKey?: string) {
  const conditions = [eq(usersTable.branchId, branchId), eq(usersTable.status, "active")];
  if (roleKey) conditions.push(eq(rolesTable.key, roleKey));

  const rows = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      mobile: usersTable.mobile,
      status: usersTable.status,
      roleKey: rolesTable.key,
      roleName: rolesTable.name,
      lastLoginAt: usersTable.lastLoginAt,
    })
    .from(usersTable)
    .innerJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
    .where(and(...conditions))
    .orderBy(usersTable.name);

  const userIds = rows.map((row) => row.id);
  const restrictionCounts =
    userIds.length === 0
      ? []
      : await db
          .select({
            userId: userRoleAssignmentsTable.userId,
            total: sql<number>`count(${roleBranchRestrictionsTable.id})`,
          })
          .from(userRoleAssignmentsTable)
          .leftJoin(
            roleBranchRestrictionsTable,
            eq(roleBranchRestrictionsTable.assignmentId, userRoleAssignmentsTable.id),
          )
          .where(inArray(userRoleAssignmentsTable.userId, userIds))
          .groupBy(userRoleAssignmentsTable.userId);

  const countByUser = new Map(restrictionCounts.map((r) => [r.userId, Number(r.total)]));

  return rows.map((row) => ({
    ...row,
    userCode: null as string | null,
    restrictionCount: countByUser.get(row.id) ?? 0,
  }));
}

export async function ensurePrimaryAssignment(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) throw new Error("User not found");

  const [existing] = await db
    .select()
    .from(userRoleAssignmentsTable)
    .where(and(eq(userRoleAssignmentsTable.userId, userId), eq(userRoleAssignmentsTable.isPrimary, true)))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(userRoleAssignmentsTable)
    .values({
      userId: user.id,
      roleId: user.roleId,
      societyId: user.societyId,
      schoolId: user.schoolId,
      branchId: user.branchId,
      isPrimary: true,
    })
    .returning();
  return created;
}

export async function getUserRestrictions(userId: number) {
  const assignment = await ensurePrimaryAssignment(userId);
  const rows = await db
    .select({
      id: roleBranchRestrictionsTable.id,
      entityType: roleBranchRestrictionsTable.entityType,
      sectionId: roleBranchRestrictionsTable.sectionId,
      classId: roleBranchRestrictionsTable.classId,
      sectionName: sectionsTable.name,
      className: classesTable.name,
    })
    .from(roleBranchRestrictionsTable)
    .leftJoin(sectionsTable, eq(roleBranchRestrictionsTable.sectionId, sectionsTable.id))
    .leftJoin(classesTable, eq(roleBranchRestrictionsTable.classId, classesTable.id))
    .where(eq(roleBranchRestrictionsTable.assignmentId, assignment.id));
  return rows;
}

export async function setUserSectionRestrictions(userId: number, sectionIds: number[]) {
  const assignment = await ensurePrimaryAssignment(userId);

  await db
    .delete(roleBranchRestrictionsTable)
    .where(
      and(
        eq(roleBranchRestrictionsTable.assignmentId, assignment.id),
        eq(roleBranchRestrictionsTable.entityType, "section"),
      ),
    );

  if (sectionIds.length === 0) return [];

  const sections = await db
    .select({ id: sectionsTable.id, classId: sectionsTable.classId })
    .from(sectionsTable)
    .where(inArray(sectionsTable.id, sectionIds));

  if (sections.length === 0) return [];

  const inserted = await db
    .insert(roleBranchRestrictionsTable)
    .values(
      sections.map((section) => ({
        assignmentId: assignment.id,
        entityType: "section" as const,
        sectionId: section.id,
        allow: true,
      })),
    )
    .returning();

  return inserted;
}

export async function updateUserRole(userId: number, roleKey: string, branchId: number) {
  const [role] = await db.select().from(rolesTable).where(eq(rolesTable.key, roleKey)).limit(1);
  if (!role) throw new Error(`Unknown role: ${roleKey}`);

  const [user] = await db
    .update(usersTable)
    .set({ roleId: role.id })
    .where(and(eq(usersTable.id, userId), eq(usersTable.branchId, branchId)))
    .returning();
  if (!user) throw new Error("User not found in branch");

  await db
    .update(userRoleAssignmentsTable)
    .set({ roleId: role.id })
    .where(and(eq(userRoleAssignmentsTable.userId, userId), eq(userRoleAssignmentsTable.isPrimary, true)));

  return user;
}

export async function listRbacAuditEvents(filters: {
  schoolId?: number | null;
  branchId?: number | null;
  limit?: number;
}) {
  const limit = filters.limit ?? 50;
  const conditions = [eq(auditLogsTable.action, "permission_changed")];
  if (filters.branchId) conditions.push(eq(auditLogsTable.branchId, filters.branchId));
  else if (filters.schoolId) conditions.push(eq(auditLogsTable.schoolId, filters.schoolId));

  return db
    .select()
    .from(auditLogsTable)
    .where(and(...conditions))
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit);
}
