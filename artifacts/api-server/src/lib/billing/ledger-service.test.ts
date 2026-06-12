import { describe, expect, it, vi } from "vitest";
import {
  postAdvanceCreditEntry,
  postAdvanceDebitEntry,
  postChargeEntry,
  postDiscountEntry,
  postLedgerEntry,
  postPaymentEntry,
} from "./ledger-service";

function createMockDb() {
  const rows: Record<string, unknown>[] = [];
  let id = 0;

  const db = {
    insert: vi.fn(() => ({
      values: (input: Record<string, unknown>) => ({
        returning: async () => {
          id += 1;
          const row = { id, ...input };
          rows.push(row);
          return [row];
        },
      }),
    })),
    rows,
  };

  return db;
}

const baseInput = {
  societyId: 1,
  schoolId: 1,
  branchId: 1,
  sessionId: 1,
  studentId: 42,
  amount: 2500,
  entryDate: "2025-04-01",
  narration: "Test entry",
};

describe("ledger-service", () => {
  it("rejects non-positive amounts", async () => {
    const db = createMockDb();
    await expect(
      postLedgerEntry(db as never, {
        ...baseInput,
        amount: 0,
        entryType: "charge",
        direction: "debit",
      }),
    ).rejects.toThrow(/amount must be positive/);
  });

  it("posts charge as debit", async () => {
    const db = createMockDb();
    const row = await postChargeEntry(db as never, baseInput);
    expect(row).toMatchObject({ entryType: "charge", direction: "debit", amount: 2500 });
  });

  it("posts payment as credit", async () => {
    const db = createMockDb();
    const row = await postPaymentEntry(db as never, baseInput);
    expect(row).toMatchObject({ entryType: "payment", direction: "credit" });
  });

  it("posts discount as credit", async () => {
    const db = createMockDb();
    const row = await postDiscountEntry(db as never, baseInput);
    expect(row).toMatchObject({ entryType: "discount", direction: "credit" });
  });

  it("posts advance credit and debit entries", async () => {
    const db = createMockDb();
    const credit = await postAdvanceCreditEntry(db as never, baseInput);
    const debit = await postAdvanceDebitEntry(db as never, {
      ...baseInput,
      referenceEntryId: credit.id as number,
    });
    expect(credit).toMatchObject({ entryType: "advance", direction: "credit" });
    expect(debit).toMatchObject({ entryType: "advance", direction: "debit" });
  });
});
