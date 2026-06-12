import { describe, expect, it } from "vitest";
import { amountInWordsRupees } from "./invoice-layout";
import { billbookSummaryValues, buildBillbookDocument } from "./invoice-renderer";
import { createDefaultBillbookLayout } from "./invoice-layout";

describe("amountInWordsRupees", () => {
  it("converts common amounts", () => {
    expect(amountInWordsRupees(3000)).toContain("Three Thousand");
    expect(amountInWordsRupees(0)).toBe("Zero Rupees Only");
  });
});

describe("buildBillbookDocument", () => {
  it("builds header, middle, footer sections from layout config", () => {
    const layout = createDefaultBillbookLayout();
    const doc = buildBillbookDocument({
      title: "FEE BILL / CHALLAN",
      layout,
      headerData: {
        school_name: "Demo School",
        invoice_number: "INV-001",
        student_name: "Raj Kumar",
        class_name: "Class 5",
      },
      lines: [
        {
          feeHeadCode: "TUIT",
          feeHeadName: "Tuition",
          description: "April Tuition",
          billingMonth: "April 2025",
          grossAmount: 3000,
          discountAmount: 500,
          discountKind: "fixed",
          netAmount: 2500,
          paidAmount: 0,
        },
      ],
      summary: {
        subtotalGross: 3000,
        totalDiscount: 500,
        totalNet: 2500,
        totalPaid: 0,
        balanceDue: 2500,
        advanceCredit: 0,
        previousBalance: 0,
      },
      footerData: {
        bank_name: "SBI",
        footer_notes: "Fees non-refundable",
      },
    });

    expect(doc.header.school_name).toBe("Demo School");
    expect(doc.header.invoice_number).toBe("INV-001");
    expect(doc.middle.rows).toHaveLength(1);
    expect(doc.middle.rows[0]?.netAmount).toBe(2500);
    expect(doc.footer.bank_name).toBe("SBI");
    expect(billbookSummaryValues(doc).balance_due).toBe(2500);
    expect(doc.middle.summary.amountInWords).toContain("Two Thousand");
  });
});
