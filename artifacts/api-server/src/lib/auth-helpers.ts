import {

  db,

  permissionsTable,

  rolePermissionsTable,

  rolesTable,

  usersTable,

} from "@workspace/db";

import { eq } from "drizzle-orm";

import type { AuthScopePayload } from "./auth-scope";



type UserRow = typeof usersTable.$inferSelect;

type RoleRow = typeof rolesTable.$inferSelect;



export function buildAuthUser(

  user: UserRow,

  role: RoleRow | undefined,

  scope: AuthScopePayload,

) {

  return {

    id: user.id,

    userCode: user.userCode,

    mobile: user.mobile,

    email: user.email,

    name: user.name,

    role: scope.role,

    roleScope: scope.roleScope,

    societyId: scope.societyId,

    schoolId: scope.schoolId,

    branchId: scope.branchId,

    sessionId: scope.sessionId,

    studentId: scope.studentId,

    status: user.status,

    createdAt: user.createdAt,

  };

}



export async function getUserPermissions(_userId: number, roleId: number): Promise<string[]> {

  const rolePerms = await db

    .select({ key: permissionsTable.key })

    .from(rolePermissionsTable)

    .innerJoin(permissionsTable, eq(rolePermissionsTable.permissionId, permissionsTable.id))

    .where(eq(rolePermissionsTable.roleId, roleId));



  return rolePerms.map((p) => p.key);

}



export async function loadAuthSession(userId: number) {

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (!user) return null;



  const [role] = await db

    .select()

    .from(rolesTable)

    .where(eq(rolesTable.id, user.roleId))

    .limit(1);



  const { resolveAuthScope } = await import("./auth-scope");

  const scope = await resolveAuthScope(user, role);

  const permissions = await getUserPermissions(user.id, user.roleId);



  return {

    user: buildAuthUser(user, role, scope),

    permissions,

  };

}


