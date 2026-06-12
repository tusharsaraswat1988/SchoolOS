import {
  academicSessionsTable,
  branchesTable,
  db,
  financialSessionsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";

export async function resolveBranchHierarchy(branchId: number) {
  const [branch] = await db
    .select()
    .from(branchesTable)
    .where(eq(branchesTable.id, branchId))
    .limit(1);
  return branch ?? null;
}

export async function setCurrentAcademicSession(branchId: number, sessionId: number) {
  await db.transaction(async (tx) => {
    await tx
      .update(academicSessionsTable)
      .set({ isCurrent: false })
      .where(eq(academicSessionsTable.branchId, branchId));
    await tx
      .update(academicSessionsTable)
      .set({ isCurrent: true })
      .where(
        and(
          eq(academicSessionsTable.id, sessionId),
          eq(academicSessionsTable.branchId, branchId),
        ),
      );
  });
}

export async function setCurrentFinancialSession(branchId: number, financialSessionId: number) {
  await db.transaction(async (tx) => {
    await tx
      .update(financialSessionsTable)
      .set({ isCurrent: false })
      .where(eq(financialSessionsTable.branchId, branchId));
    await tx
      .update(financialSessionsTable)
      .set({ isCurrent: true })
      .where(
        and(
          eq(financialSessionsTable.id, financialSessionId),
          eq(financialSessionsTable.branchId, branchId),
        ),
      );
  });
}
