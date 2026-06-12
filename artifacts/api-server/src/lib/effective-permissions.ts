import {
  db,
  permissionsTable,
  rolePermissionsTable,
  userPermissionsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";

export const PLATFORM_FULL_ACCESS = "platform.full_access";

export function hasPermission(permissions: string[], key: string): boolean {
  if (permissions.includes(PLATFORM_FULL_ACCESS)) return true;
  return permissions.includes(key);
}

export function hasAnyPermission(permissions: string[], keys: string[]): boolean {
  if (permissions.includes(PLATFORM_FULL_ACCESS)) return true;
  return keys.some((key) => permissions.includes(key));
}

export function hasAllPermissions(permissions: string[], keys: string[]): boolean {
  if (permissions.includes(PLATFORM_FULL_ACCESS)) return true;
  return keys.every((key) => permissions.includes(key));
}

export async function resolveEffectivePermissions(
  userId: number,
  roleId: number,
): Promise<string[]> {
  const roleRows = await db
    .select({
      key: permissionsTable.key,
      isAllowed: rolePermissionsTable.isAllowed,
    })
    .from(rolePermissionsTable)
    .innerJoin(permissionsTable, eq(rolePermissionsTable.permissionId, permissionsTable.id))
    .where(
      and(
        eq(rolePermissionsTable.roleId, roleId),
        eq(rolePermissionsTable.isAllowed, true),
        eq(permissionsTable.status, "active"),
      ),
    );

  const userRows = await db
    .select({
      key: permissionsTable.key,
      isAllowed: userPermissionsTable.isAllowed,
    })
    .from(userPermissionsTable)
    .innerJoin(permissionsTable, eq(userPermissionsTable.permissionId, permissionsTable.id))
    .where(
      and(eq(userPermissionsTable.userId, userId), eq(permissionsTable.status, "active")),
    );

  const granted = new Set(roleRows.map((row) => row.key));
  for (const row of userRows) {
    if (row.isAllowed) granted.add(row.key);
    else granted.delete(row.key);
  }

  return [...granted].sort();
}
