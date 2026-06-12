import { numberSequencesTable } from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@workspace/db/schema";

type Db = NodePgDatabase<typeof schema>;

export type SequenceType = "invoice" | "receipt" | "payment";

export function formatSequenceNumber(prefix: string, value: number, padding: number) {
  return `${prefix}${String(value).padStart(padding, "0")}`;
}

/** Atomically reserve the next formatted number for a branch/session/type. */
export async function nextSequenceNumber(
  db: Db,
  input: {
    branchId: number;
    sessionId: number | null;
    sequenceType: SequenceType;
  },
): Promise<string> {
  return db.transaction(async (tx) => {
    const conditions = [
      eq(numberSequencesTable.branchId, input.branchId),
      eq(numberSequencesTable.sequenceType, input.sequenceType),
    ];
    if (input.sessionId == null) {
      conditions.push(sql`${numberSequencesTable.sessionId} IS NULL`);
    } else {
      conditions.push(eq(numberSequencesTable.sessionId, input.sessionId));
    }

    const [existing] = await tx
      .select()
      .from(numberSequencesTable)
      .where(and(...conditions))
      .limit(1)
      .for("update");

    if (!existing) {
      throw new Error(
        `Number sequence not configured for branch=${input.branchId} session=${input.sessionId} type=${input.sequenceType}`,
      );
    }

    const formatted = formatSequenceNumber(
      existing.prefix,
      existing.nextValue,
      existing.padding,
    );

    await tx
      .update(numberSequencesTable)
      .set({ nextValue: existing.nextValue + 1 })
      .where(eq(numberSequencesTable.id, existing.id));

    return formatted;
  });
}
