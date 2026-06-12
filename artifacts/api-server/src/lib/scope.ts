import {
  academicSessionsTable,
  branchesTable,
  db,
  financialSessionsTable,
  schoolsTable,
  societiesTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";

export type SessionScope = {
  societyId: number;
  schoolId: number;
  branchId: number;
  sessionId: number;
};

export type BranchScope = {
  societyId: number;
  schoolId: number;
  branchId: number;
};

export async function resolveSessionScope(
  branchId: number,
  sessionId: number,
): Promise<SessionScope | null> {
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
  if (!session) return null;
  return {
    societyId: session.societyId,
    schoolId: session.schoolId,
    branchId: session.branchId,
    sessionId: session.id,
  };
}

export async function resolveBranchScope(branchId: number): Promise<BranchScope | null> {
  const [branch] = await db
    .select()
    .from(branchesTable)
    .where(eq(branchesTable.id, branchId))
    .limit(1);
  if (!branch) return null;
  return {
    societyId: branch.societyId,
    schoolId: branch.schoolId,
    branchId: branch.id,
  };
}

export async function resolveCurrentSession(branchId: number) {
  const [session] = await db
    .select()
    .from(academicSessionsTable)
    .where(
      and(
        eq(academicSessionsTable.branchId, branchId),
        eq(academicSessionsTable.isCurrent, true),
      ),
    )
    .limit(1);
  return session ?? null;
}

export async function resolveCurrentFinancialSession(branchId: number) {
  const [session] = await db
    .select()
    .from(financialSessionsTable)
    .where(
      and(
        eq(financialSessionsTable.branchId, branchId),
        eq(financialSessionsTable.isCurrent, true),
      ),
    )
    .limit(1);
  return session ?? null;
}
