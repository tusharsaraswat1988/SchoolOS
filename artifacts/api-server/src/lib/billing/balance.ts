export type LedgerBalanceEntry = {
  direction: "debit" | "credit";
  amount: number;
  entryType: "charge" | "payment" | "discount" | "advance";
  isVoid: boolean;
};

export type StudentBalance = {
  outstanding: number;
  advanceCredit: number;
};

/** Pure balance computation — used by balance service and unit tests. */
export function computeBalanceFromEntries(entries: LedgerBalanceEntry[]): StudentBalance {
  let debits = 0;
  let credits = 0;

  for (const entry of entries) {
    if (entry.isVoid) continue;
    if (entry.direction === "debit") debits += entry.amount;
    else credits += entry.amount;
  }

  const net = debits - credits;
  return {
    outstanding: Math.max(0, net),
    advanceCredit: Math.max(0, -net),
  };
}

/** Advance credit = net credit balance from advance-type entries still unapplied. */
export function computeAdvanceCreditFromEntries(entries: LedgerBalanceEntry[]): number {
  let advanceCredits = 0;
  let advanceDebits = 0;

  for (const entry of entries) {
    if (entry.isVoid || entry.entryType !== "advance") continue;
    if (entry.direction === "credit") advanceCredits += entry.amount;
    else advanceDebits += entry.amount;
  }

  return Math.max(0, advanceCredits - advanceDebits);
}
