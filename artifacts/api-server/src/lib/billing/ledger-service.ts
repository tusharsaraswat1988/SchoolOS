import { ledgerEntriesTable } from "@workspace/db/schema";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@workspace/db/schema";

type Db = NodePgDatabase<typeof schema>;

export type PostLedgerEntryInput = {
  societyId: number;
  schoolId: number;
  branchId: number;
  sessionId: number;
  studentId: number;
  entryType: "charge" | "payment" | "discount" | "advance";
  direction: "debit" | "credit";
  amount: number;
  feeHeadId?: number | null;
  invoiceId?: number | null;
  invoiceItemId?: number | null;
  paymentId?: number | null;
  referenceEntryId?: number | null;
  entryDate: string;
  narration: string;
  createdBy?: number | null;
};

export async function postLedgerEntry(db: Db, input: PostLedgerEntryInput) {
  if (input.amount <= 0) {
    throw new Error("Ledger entry amount must be positive");
  }

  const [row] = await db
    .insert(ledgerEntriesTable)
    .values({
      societyId: input.societyId,
      schoolId: input.schoolId,
      branchId: input.branchId,
      sessionId: input.sessionId,
      studentId: input.studentId,
      entryType: input.entryType,
      direction: input.direction,
      amount: input.amount,
      feeHeadId: input.feeHeadId ?? null,
      invoiceId: input.invoiceId ?? null,
      invoiceItemId: input.invoiceItemId ?? null,
      paymentId: input.paymentId ?? null,
      referenceEntryId: input.referenceEntryId ?? null,
      entryDate: input.entryDate,
      narration: input.narration,
      createdBy: input.createdBy ?? null,
    })
    .returning();

  return row;
}

export async function postChargeEntry(
  db: Db,
  input: Omit<PostLedgerEntryInput, "entryType" | "direction">,
) {
  return postLedgerEntry(db, { ...input, entryType: "charge", direction: "debit" });
}

export async function postPaymentEntry(
  db: Db,
  input: Omit<PostLedgerEntryInput, "entryType" | "direction">,
) {
  return postLedgerEntry(db, { ...input, entryType: "payment", direction: "credit" });
}

export async function postDiscountEntry(
  db: Db,
  input: Omit<PostLedgerEntryInput, "entryType" | "direction">,
) {
  return postLedgerEntry(db, { ...input, entryType: "discount", direction: "credit" });
}

export async function postAdvanceCreditEntry(
  db: Db,
  input: Omit<PostLedgerEntryInput, "entryType" | "direction">,
) {
  return postLedgerEntry(db, { ...input, entryType: "advance", direction: "credit" });
}

export async function postAdvanceDebitEntry(
  db: Db,
  input: Omit<PostLedgerEntryInput, "entryType" | "direction">,
) {
  return postLedgerEntry(db, { ...input, entryType: "advance", direction: "debit" });
}
