import {
  academicSessionsTable,
  branchesTable,
  db,
  schoolsTable,
  studentsTable,
  usersTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import type { AuthScopePayload } from "./auth-scope";

const BRANCH_SESSION_ROLES = new Set(["principal", "teacher", "accountant", "coordinator"]);

const STUDENT_SCOPED_ROLES = new Set(["parent", "student"]);

export async function fetchBranch(branchId: number) {
  const [branch] = await db
    .select()
    .from(branchesTable)
    .where(eq(branchesTable.id, branchId))
    .limit(1);
  return branch ?? null;
}

export async function fetchSchool(schoolId: number) {
  const [school] = await db
    .select()
    .from(schoolsTable)
    .where(eq(schoolsTable.id, schoolId))
    .limit(1);
  return school ?? null;
}

export async function fetchSession(branchId: number, sessionId: number) {
  const [session] = await db
    .select()
    .from(academicSessionsTable)
    .where(
      and(
        eq(academicSessionsTable.id, sessionId),
        eq(academicSessionsTable.branchId, branchId),
      ),
    )
    .limit(1);
  return session ?? null;
}

export async function fetchStudent(studentId: number) {
  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, studentId))
    .limit(1);
  return student ?? null;
}

export async function fetchBranchUser(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return user ?? null;
}

export type AccessDecision = { allowed: true } | { allowed: false; reason: string };

export type ResourceIds = {
  societyId?: number;
  schoolId?: number;
  branchId?: number;
  sessionId?: number;
  studentId?: number;
  userId?: number;
};

export function extractIdsFromPath(path: string): ResourceIds {
  const ids: ResourceIds = {};
  const segments = path.split("/").filter(Boolean);
  const keyMap: Record<string, keyof ResourceIds> = {
    societies: "societyId",
    schools: "schoolId",
    branches: "branchId",
    sessions: "sessionId",
    students: "studentId",
    users: "userId",
  };

  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    const field = keyMap[segment];
    if (!field) continue;
    const num = Number(segments[i + 1]);
    if (Number.isFinite(num)) {
      ids[field] = num;
    }
  }

  return ids;
}

function mergeResourceIds(path: string, params: Record<string, string>): ResourceIds {
  const fromPath = extractIdsFromPath(path);
  const fromParams: ResourceIds = {};
  for (const [key, raw] of Object.entries(params)) {
    const num = Number(raw);
    if (!Number.isFinite(num)) continue;
    if (key === "societyId") fromParams.societyId = num;
    if (key === "schoolId") fromParams.schoolId = num;
    if (key === "branchId") fromParams.branchId = num;
    if (key === "sessionId") fromParams.sessionId = num;
    if (key === "studentId") fromParams.studentId = num;
    if (key === "userId") fromParams.userId = num;
  }
  return { ...fromPath, ...fromParams };
}

export async function validateResourceAccess(
  scope: AuthScopePayload,
  resource: ResourceIds,
): Promise<AccessDecision> {
  if (scope.role === "super_admin") {
    return { allowed: true };
  }

  if (STUDENT_SCOPED_ROLES.has(scope.role)) {
    if (resource.studentId != null) {
      return scope.studentId === resource.studentId
        ? { allowed: true }
        : { allowed: false, reason: "Forbidden" };
    }
    return { allowed: false, reason: "Forbidden" };
  }

  if (scope.role === "society_admin") {
    if (resource.societyId != null) {
      return scope.societyId === resource.societyId
        ? { allowed: true }
        : { allowed: false, reason: "Forbidden" };
    }
    if (resource.schoolId != null) {
      const school = await fetchSchool(resource.schoolId);
      if (!school) return { allowed: false, reason: "Forbidden" };
      return scope.societyId === school.societyId
        ? { allowed: true }
        : { allowed: false, reason: "Forbidden" };
    }
    if (resource.branchId != null) {
      const branch = await fetchBranch(resource.branchId);
      if (!branch) return { allowed: false, reason: "Forbidden" };
      return scope.societyId === branch.societyId
        ? { allowed: true }
        : { allowed: false, reason: "Forbidden" };
    }
    if (resource.sessionId != null && resource.branchId != null) {
      const session = await fetchSession(resource.branchId, resource.sessionId);
      if (!session) return { allowed: false, reason: "Forbidden" };
      return scope.societyId === session.societyId
        ? { allowed: true }
        : { allowed: false, reason: "Forbidden" };
    }
    if (resource.studentId != null) {
      const student = await fetchStudent(resource.studentId);
      if (!student) return { allowed: false, reason: "Forbidden" };
      return scope.societyId === student.societyId
        ? { allowed: true }
        : { allowed: false, reason: "Forbidden" };
    }
    return { allowed: false, reason: "Forbidden" };
  }

  if (scope.role === "school_admin") {
    if (resource.schoolId != null) {
      return scope.schoolId === resource.schoolId
        ? { allowed: true }
        : { allowed: false, reason: "Forbidden" };
    }
    if (resource.branchId != null) {
      const branch = await fetchBranch(resource.branchId);
      if (!branch) return { allowed: false, reason: "Forbidden" };
      return scope.schoolId === branch.schoolId
        ? { allowed: true }
        : { allowed: false, reason: "Forbidden" };
    }
    if (resource.sessionId != null && resource.branchId != null) {
      const session = await fetchSession(resource.branchId, resource.sessionId);
      if (!session) return { allowed: false, reason: "Forbidden" };
      return scope.schoolId === session.schoolId
        ? { allowed: true }
        : { allowed: false, reason: "Forbidden" };
    }
    if (resource.studentId != null) {
      const student = await fetchStudent(resource.studentId);
      if (!student) return { allowed: false, reason: "Forbidden" };
      return scope.schoolId === student.schoolId
        ? { allowed: true }
        : { allowed: false, reason: "Forbidden" };
    }
    if (resource.userId != null) {
      const target = await fetchBranchUser(resource.userId);
      if (!target || target.schoolId !== scope.schoolId) {
        return { allowed: false, reason: "Forbidden" };
      }
    }
    return { allowed: false, reason: "Forbidden" };
  }

  if (BRANCH_SESSION_ROLES.has(scope.role)) {
    if (resource.branchId != null && scope.branchId !== resource.branchId) {
      return { allowed: false, reason: "Forbidden" };
    }
    if (resource.sessionId != null) {
      if (!resource.branchId || scope.branchId !== resource.branchId) {
        return { allowed: false, reason: "Forbidden" };
      }
      const session = await fetchSession(resource.branchId, resource.sessionId);
      if (!session) return { allowed: false, reason: "Forbidden" };
      if (scope.sessionId != null && scope.sessionId !== resource.sessionId) {
        return { allowed: false, reason: "Forbidden" };
      }
    }
    if (resource.userId != null) {
      const target = await fetchBranchUser(resource.userId);
      if (!target || target.branchId !== scope.branchId) {
        return { allowed: false, reason: "Forbidden" };
      }
    }
    if (resource.studentId != null) {
      const student = await fetchStudent(resource.studentId);
      if (!student || student.branchId !== scope.branchId) {
        return { allowed: false, reason: "Forbidden" };
      }
      if (resource.sessionId != null && student.sessionId !== resource.sessionId) {
        return { allowed: false, reason: "Forbidden" };
      }
    }
    if (resource.branchId != null) {
      return { allowed: true };
    }
    return { allowed: false, reason: "Forbidden" };
  }

  return { allowed: false, reason: "Forbidden" };
}

export async function validateRequestAccess(
  method: string,
  path: string,
  params: Record<string, string>,
  scope: AuthScopePayload,
): Promise<AccessDecision> {
  if (scope.role === "super_admin") {
    return { allowed: true };
  }

  if (path === "/platform/dashboard") {
    return { allowed: false, reason: "Forbidden" };
  }

  if (path === "/auth/logout" || path === "/auth/me") {
    return { allowed: true };
  }

  if (STUDENT_SCOPED_ROLES.has(scope.role)) {
    const ids = mergeResourceIds(path, params);
    if (ids.studentId != null) {
      return validateResourceAccess(scope, ids);
    }
    return { allowed: false, reason: "Forbidden" };
  }

  if (path === "/schools" || path === "/schools/") {
    if (method === "GET") {
      return { allowed: false, reason: "Forbidden" };
    }
    if (method === "POST") {
      return scope.role === "society_admin"
        ? { allowed: true }
        : { allowed: false, reason: "Forbidden" };
    }
  }

  if (path === "/societies" || path === "/societies/") {
    return scope.role === "society_admin" ? { allowed: true } : { allowed: false, reason: "Forbidden" };
  }

  const ids = mergeResourceIds(path, params);
  const hasResource =
    ids.societyId != null ||
    ids.schoolId != null ||
    ids.branchId != null ||
    ids.sessionId != null ||
    ids.studentId != null ||
    ids.userId != null;

  if (!hasResource) {
    return { allowed: false, reason: "Forbidden" };
  }

  return validateResourceAccess(scope, ids);
}
