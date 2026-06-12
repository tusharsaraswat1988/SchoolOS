import { ledgerEntriesTable } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@workspace/db/schema";
import {
  computeAdvanceCreditFromEntries,
  computeBalanceFromEntries,
  type StudentBalance,
} from "./balance";

type Db = NodePgDatabase<typeof schema>;

export async function getStudentBalance(
  db: Db,
  input: { branchId: number; sessionId: number; studentId: number },
): Promise<StudentBalance & { advanceCredit: number }> {
  const rows = await db
    .select({
      direction: ledgerEntriesTable.direction,
      amount: ledgerEntriesTable.amount,
      entryType: ledgerEntriesTable.entryType,
      isVoid: ledgerEntriesTable.isVoid,
    })
    .from(ledgerEntriesTable)
    .where(
      and(
        eq(ledgerEntriesTable.branchId, input.branchId),
        eq(ledgerEntriesTable.sessionId, input.sessionId),
        eq(ledgerEntriesTable.studentId, input.studentId),
      ),
    );

  const balance = computeBalanceFromEntries(rows);
  const advanceCredit = computeAdvanceCreditFromEntries(rows);

  return { ...balance, advanceCredit };
}
