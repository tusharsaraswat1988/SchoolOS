import { describe, expect, it } from "vitest";
import {
  computeAdvanceCreditFromEntries,
  computeBalanceFromEntries,
  type LedgerBalanceEntry,
} from "./balance";

function entry(
  partial: Partial<LedgerBalanceEntry> & Pick<LedgerBalanceEntry, "direction" | "amount" | "entryType">,
): LedgerBalanceEntry {
  return { isVoid: false, ...partial };
}

describe("computeBalanceFromEntries", () => {
  it("returns zero when no entries", () => {
    expect(computeBalanceFromEntries([])).toEqual({ outstanding: 0, advanceCredit: 0 });
  });

  it("computes outstanding as charge minus payment", () => {
    const balance = computeBalanceFromEntries([
      entry({ direction: "debit", amount: 5000, entryType: "charge" }),
      entry({ direction: "credit", amount: 3000, entryType: "payment" }),
    ]);
    expect(balance.outstanding).toBe(2000);
    expect(balance.advanceCredit).toBe(0);
  });

  it("treats overpayment as advance credit", () => {
    const balance = computeBalanceFromEntries([
      entry({ direction: "debit", amount: 3000, entryType: "charge" }),
      entry({ direction: "credit", amount: 5000, entryType: "payment" }),
    ]);
    expect(balance.outstanding).toBe(0);
    expect(balance.advanceCredit).toBe(2000);
  });

  it("ignores void entries", () => {
    const balance = computeBalanceFromEntries([
      entry({ direction: "debit", amount: 4000, entryType: "charge" }),
      entry({ direction: "credit", amount: 4000, entryType: "payment", isVoid: true }),
    ]);
    expect(balance.outstanding).toBe(4000);
  });

  it("includes discount credits in balance", () => {
    const balance = computeBalanceFromEntries([
      entry({ direction: "debit", amount: 5000, entryType: "charge" }),
      entry({ direction: "credit", amount: 1000, entryType: "discount" }),
      entry({ direction: "credit", amount: 2000, entryType: "payment" }),
    ]);
    expect(balance.outstanding).toBe(2000);
  });
});

describe("computeAdvanceCreditFromEntries", () => {
  it("tracks advance credits minus advance debits", () => {
    const advance = computeAdvanceCreditFromEntries([
      entry({ direction: "credit", amount: 4000, entryType: "advance" }),
      entry({ direction: "debit", amount: 1500, entryType: "advance" }),
    ]);
    expect(advance).toBe(2500);
  });

  it("ignores non-advance entry types", () => {
    const advance = computeAdvanceCreditFromEntries([
      entry({ direction: "credit", amount: 5000, entryType: "payment" }),
      entry({ direction: "credit", amount: 1000, entryType: "advance" }),
    ]);
    expect(advance).toBe(1000);
  });
});

describe("ledger balance integration", () => {
  it("charge minus payment equals outstanding balance", () => {
    const entries: LedgerBalanceEntry[] = [
      entry({ direction: "debit", amount: 8000, entryType: "charge" }),
      entry({ direction: "credit", amount: 5000, entryType: "payment" }),
    ];
    const { outstanding } = computeBalanceFromEntries(entries);
    expect(outstanding).toBe(3000);
  });
});
