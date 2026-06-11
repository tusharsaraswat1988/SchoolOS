import {
  academicSessionsTable,
  branchesTable,
  db,
  parentsTable,
  rolesTable,
  schoolsTable,
  usersTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { resolveCurrentSession } from "./scope";

export type RoleScopeTier = "platform" | "society" | "school" | "branch";

export type AuthScopePayload = {
  role: string;
  roleScope: RoleScopeTier;
  societyId: number | null;
  schoolId: number | null;
  branchId: number | null;
  sessionId: number | null;
  studentId: number | null;
};

type UserRow = typeof usersTable.$inferSelect;
type RoleRow = typeof rolesTable.$inferSelect;

export async function resolveStudentId(user: UserRow, roleKey: string): Promise<number | null> {
  if (user.studentId) return user.studentId;
  if (roleKey === "parent") {
    const [link] = await db
      .select({ studentId: parentsTable.studentId })
      .from(parentsTable)
      .where(and(eq(parentsTable.userId, user.id), eq(parentsTable.isPrimary, true)))
      .limit(1);
    return link?.studentId ?? null;
  }
  return null;
}

export async function resolveAuthScope(
  user: UserRow,
  role: RoleRow | undefined,
): Promise<AuthScopePayload> {
  const roleKey = role?.key ?? "teacher";
  const roleScope = (role?.scope ?? "branch") as RoleScopeTier;
  let sessionId: number | null = null;

  if (user.branchId && ["principal", "teacher", "accountant", "coordinator", "school_admin"].includes(roleKey)) {
    const session = await resolveCurrentSession(user.branchId);
    sessionId = session?.id ?? null;
  }

  const studentId = await resolveStudentId(user, roleKey);

  return {
    role: roleKey,
    roleScope,
    societyId: user.societyId,
    schoolId: user.schoolId,
    branchId: user.branchId,
    sessionId,
    studentId,
  };
}

export async function countSchoolBranches(schoolId: number): Promise<number> {
  const rows = await db
    .select({ id: branchesTable.id })
    .from(branchesTable)
    .where(and(eq(branchesTable.schoolId, schoolId), eq(branchesTable.status, "active")));
  return rows.length;
}

export async function resolveSchoolByCode(code: string) {
  const normalized = code.trim().toUpperCase();
  const [school] = await db
    .select()
    .from(schoolsTable)
    .where(eq(schoolsTable.code, normalized))
    .limit(1);
  return school ?? null;
}

export function userMatchesSchool(user: UserRow, roleKey: string, schoolId: number | null): boolean {
  if (roleKey === "super_admin") return true;
  if (roleKey === "society_admin") return true;
  if (!schoolId) return false;
  if (user.schoolId === schoolId) return true;
  if (user.societyId) return true;
  return false;
}
