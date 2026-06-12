import { describe, expect, it } from "vitest";
import { formatSequenceNumber, nextSequenceNumber } from "./number-sequence";

describe("formatSequenceNumber", () => {
  it("pads numeric suffix", () => {
    expect(formatSequenceNumber("INV-2526-", 42, 4)).toBe("INV-2526-0042");
  });
});

describe("nextSequenceNumber", () => {
  it("increments atomically within a transaction", async () => {
    let stored = {
      id: 1,
      branchId: 1,
      sessionId: 2,
      sequenceType: "invoice" as const,
      prefix: "INV-2526-",
      nextValue: 10,
      padding: 4,
    };

    const db = {
      transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
        const tx = {
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => ({
                  for: async () => [stored],
                }),
              }),
            }),
          }),
          update: () => ({
            set: (values: { nextValue: number }) => ({
              where: () => {
                stored = { ...stored, nextValue: values.nextValue };
                return Promise.resolve();
              },
            }),
          }),
        };
        return fn(tx as never);
      },
    };

    const first = await nextSequenceNumber(db as never, {
      branchId: 1,
      sessionId: 2,
      sequenceType: "invoice",
    });
    const second = await nextSequenceNumber(db as never, {
      branchId: 1,
      sessionId: 2,
      sequenceType: "invoice",
    });

    expect(first).toBe("INV-2526-0010");
    expect(second).toBe("INV-2526-0011");
    expect(stored.nextValue).toBe(12);
  });

  it("returns unique numbers under concurrent reservations", async () => {
    let stored = {
      id: 1,
      branchId: 1,
      sessionId: 2,
      sequenceType: "payment" as const,
      prefix: "PAY-",
      nextValue: 1,
      padding: 3,
    };
    let lock: Promise<void> = Promise.resolve();

    const db = {
      transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
        let release!: () => void;
        const wait = lock;
        lock = new Promise<void>((resolve) => {
          release = resolve;
        });
        await wait;

        const tx = {
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => ({
                  for: async () => {
                    await new Promise((r) => setTimeout(r, 5));
                    return [{ ...stored }];
                  },
                }),
              }),
            }),
          }),
          update: () => ({
            set: (values: { nextValue: number }) => ({
              where: () => {
                stored = { ...stored, nextValue: values.nextValue };
                release();
                return Promise.resolve();
              },
            }),
          }),
        };

        try {
          return await fn(tx as never);
        } catch (err) {
          release();
          throw err;
        }
      },
    };

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        nextSequenceNumber(db as never, {
          branchId: 1,
          sessionId: 2,
          sequenceType: "payment",
        }),
      ),
    );

    expect(new Set(results).size).toBe(5);
    expect(results.sort()).toEqual(["PAY-001", "PAY-002", "PAY-003", "PAY-004", "PAY-005"]);
  });

  it("throws when sequence is not configured", async () => {
    const db = {
      transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
        const tx = {
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => ({
                  for: async () => [],
                }),
              }),
            }),
          }),
        };
        return fn(tx as never);
      },
    };

    await expect(
      nextSequenceNumber(db as never, {
        branchId: 99,
        sessionId: null,
        sequenceType: "receipt",
      }),
    ).rejects.toThrow(/Number sequence not configured/);
  });
});
