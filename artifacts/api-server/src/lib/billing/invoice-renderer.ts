import {
  amountInWordsRupees,
  type InvoiceFooterField,
  type InvoiceHeaderField,
  type InvoiceLayoutConfig,
  type InvoiceMiddleColumn,
  type InvoiceMiddleSummaryRow,
} from "./invoice-layout";

export type BillbookHeaderData = Partial<Record<InvoiceHeaderField, string | null>>;
export type BillbookFooterData = Partial<Record<InvoiceFooterField, string | null>>;

export type BillbookLineRow = {
  serial: number;
  feeHeadCode: string;
  feeHeadName: string;
  description: string;
  billingMonth: string;
  grossAmount: number;
  discountAmount: number;
  discountKind: string | null;
  discountPercent: string | null;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  remarks: string;
};

export type BillbookSummary = {
  subtotalGross: number;
  totalDiscount: number;
  totalNet: number;
  totalPaid: number;
  balanceDue: number;
  advanceCredit: number;
  previousBalance: number;
  amountInWords: string;
};

export type BillbookDocument = {
  title: string;
  layout: InvoiceLayoutConfig;
  header: BillbookHeaderData;
  middle: {
    columns: InvoiceMiddleColumn[];
    rows: BillbookLineRow[];
    summaryRows: InvoiceMiddleSummaryRow[];
    summary: BillbookSummary;
  };
  footer: BillbookFooterData;
};

function pickFields<T extends string>(
  fields: T[],
  data: Partial<Record<T, string | null>>,
): Partial<Record<T, string | null>> {
  const out: Partial<Record<T, string | null>> = {};
  for (const field of fields) {
    if (field in data) out[field] = data[field] ?? null;
  }
  return out;
}

function formatColumnValue(row: BillbookLineRow, column: InvoiceMiddleColumn): string | number {
  switch (column) {
    case "serial":
      return row.serial;
    case "fee_head_code":
      return row.feeHeadCode;
    case "fee_head_name":
      return row.feeHeadName;
    case "description":
      return row.description;
    case "billing_month":
      return row.billingMonth;
    case "gross_amount":
      return row.grossAmount;
    case "discount_amount":
      return row.discountAmount;
    case "discount_kind":
      return row.discountKind ?? "";
    case "discount_percent":
      return row.discountPercent ?? "";
    case "net_amount":
      return row.netAmount;
    case "paid_amount":
      return row.paidAmount;
    case "balance_amount":
      return row.balanceAmount;
    case "remarks":
      return row.remarks;
    default:
      return "";
  }
}

export function buildBillbookDocument(input: {
  title: string;
  layout: InvoiceLayoutConfig;
  headerData: BillbookHeaderData;
  lines: Array<{
    feeHeadCode: string;
    feeHeadName: string;
    description: string;
    billingMonth: string;
    grossAmount: number;
    discountAmount: number;
    discountKind: string | null;
    netAmount: number;
    paidAmount: number;
    remarks?: string;
  }>;
  summary: Omit<BillbookSummary, "amountInWords">;
  footerData: BillbookFooterData;
}): BillbookDocument {
  const rows: BillbookLineRow[] = input.lines.map((line, index) => ({
    serial: index + 1,
    feeHeadCode: line.feeHeadCode,
    feeHeadName: line.feeHeadName,
    description: line.description,
    billingMonth: line.billingMonth,
    grossAmount: line.grossAmount,
    discountAmount: line.discountAmount,
    discountKind: line.discountKind,
    discountPercent:
      line.discountKind === "percent" && line.grossAmount > 0
        ? String(Math.round((line.discountAmount / line.grossAmount) * 100))
        : null,
    netAmount: line.netAmount,
    paidAmount: line.paidAmount,
    balanceAmount: Math.max(0, line.netAmount - line.paidAmount),
    remarks: line.remarks ?? "",
  }));

  const summary: BillbookSummary = {
    ...input.summary,
    amountInWords: amountInWordsRupees(input.summary.balanceDue || input.summary.totalNet),
  };

  return {
    title: input.title,
    layout: input.layout,
    header: pickFields(input.layout.header.fields, {
      ...input.headerData,
      invoice_title: input.title,
    }),
    middle: {
      columns: input.layout.middle.columns,
      rows,
      summaryRows: input.layout.middle.summaryRows,
      summary,
    },
    footer: pickFields(input.layout.footer.fields, input.footerData),
  };
}

/** Tabular rows keyed by configured middle columns — for print/HTML templates. */
export function billbookMiddleTable(doc: BillbookDocument) {
  return doc.middle.rows.map((row) => {
    const cells: Record<string, string | number> = {};
    for (const column of doc.middle.columns) {
      cells[column] = formatColumnValue(row, column);
    }
    return cells;
  });
}

export function billbookSummaryValues(doc: BillbookDocument): Partial<Record<InvoiceMiddleSummaryRow, string | number>> {
  const s = doc.middle.summary;
  return {
    subtotal_gross: s.subtotalGross,
    total_discount: s.totalDiscount,
    total_net: s.totalNet,
    total_paid: s.totalPaid,
    balance_due: s.balanceDue,
    advance_credit: s.advanceCredit,
    previous_balance: s.previousBalance,
    amount_in_words: s.amountInWords,
  };
}
