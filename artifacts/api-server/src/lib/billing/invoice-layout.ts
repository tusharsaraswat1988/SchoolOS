/**
 * Billbook-style invoice layout — header / middle / footer field registry.
 * Used by templates, settings UI, and invoice renderer.
 */

export const INVOICE_HEADER_FIELDS = [
  "school_name",
  "branch_name",
  "school_address",
  "branch_address",
  "affiliation_board",
  "affiliation_number",
  "school_mobile",
  "school_email",
  "invoice_title",
  "invoice_number",
  "invoice_prefix",
  "session_name",
  "session_code",
  "billing_period",
  "issue_date",
  "due_date",
  "student_name",
  "admission_number",
  "registration_number",
  "roll_number",
  "class_name",
  "section_name",
  "father_name",
  "mother_name",
  "guardian_name",
  "student_mobile",
  "social_category",
] as const;

export const INVOICE_MIDDLE_COLUMNS = [
  "serial",
  "fee_head_code",
  "fee_head_name",
  "description",
  "billing_month",
  "gross_amount",
  "discount_amount",
  "discount_kind",
  "discount_percent",
  "net_amount",
  "paid_amount",
  "balance_amount",
  "remarks",
] as const;

export const INVOICE_MIDDLE_SUMMARY_ROWS = [
  "subtotal_gross",
  "total_discount",
  "total_net",
  "total_paid",
  "balance_due",
  "amount_in_words",
  "previous_balance",
  "advance_credit",
] as const;

export const INVOICE_FOOTER_FIELDS = [
  "payment_instructions",
  "bank_name",
  "bank_account",
  "bank_ifsc",
  "upi_id",
  "footer_notes",
  "terms_and_conditions",
  "authorized_signatory",
  "accountant_signatory",
  "parent_signature",
  "generated_at",
  "generated_by",
] as const;

export type InvoiceHeaderField = (typeof INVOICE_HEADER_FIELDS)[number];
export type InvoiceMiddleColumn = (typeof INVOICE_MIDDLE_COLUMNS)[number];
export type InvoiceMiddleSummaryRow = (typeof INVOICE_MIDDLE_SUMMARY_ROWS)[number];
export type InvoiceFooterField = (typeof INVOICE_FOOTER_FIELDS)[number];

export type InvoiceHeaderConfig = {
  /** Visible header data fields (billbook top section). */
  fields: InvoiceHeaderField[];
  showLogo?: boolean;
  customLines?: string[];
};

export type InvoiceMiddleConfig = {
  /** Line-item table columns. */
  columns: InvoiceMiddleColumn[];
  /** Totals block below line items. */
  summaryRows: InvoiceMiddleSummaryRow[];
  showAmountInWords?: boolean;
  groupByFeeHead?: boolean;
};

export type InvoiceFooterConfig = {
  fields: InvoiceFooterField[];
  showSignatureBlocks?: boolean;
};

export type InvoiceLayoutConfig = {
  header: InvoiceHeaderConfig;
  middle: InvoiceMiddleConfig;
  footer: InvoiceFooterConfig;
};

export const DEFAULT_INVOICE_LAYOUT: InvoiceLayoutConfig = {
  header: {
    fields: [
      "school_name",
      "branch_name",
      "school_address",
      "invoice_title",
      "invoice_number",
      "session_name",
      "billing_period",
      "issue_date",
      "due_date",
      "student_name",
      "admission_number",
      "class_name",
      "section_name",
      "father_name",
    ],
    showLogo: true,
    customLines: [],
  },
  middle: {
    columns: [
      "serial",
      "fee_head_name",
      "description",
      "gross_amount",
      "discount_amount",
      "net_amount",
    ],
    summaryRows: ["subtotal_gross", "total_discount", "total_net", "balance_due", "amount_in_words"],
    showAmountInWords: true,
    groupByFeeHead: false,
  },
  footer: {
    fields: [
      "payment_instructions",
      "bank_name",
      "bank_account",
      "bank_ifsc",
      "footer_notes",
      "authorized_signatory",
    ],
    showSignatureBlocks: true,
  },
};

/** Default Indian school billbook layout with common header/footer options. */
export function createDefaultBillbookLayout(title = "FEE BILL / CHALLAN"): InvoiceLayoutConfig & {
  title: string;
} {
  return {
    title,
    ...DEFAULT_INVOICE_LAYOUT,
    header: {
      ...DEFAULT_INVOICE_LAYOUT.header,
      fields: [
        "school_name",
        "branch_name",
        "school_address",
        "affiliation_board",
        "invoice_title",
        "invoice_number",
        "invoice_prefix",
        "session_name",
        "billing_period",
        "issue_date",
        "due_date",
        "student_name",
        "admission_number",
        "roll_number",
        "class_name",
        "section_name",
        "father_name",
        "student_mobile",
      ],
    },
    middle: {
      columns: [
        "serial",
        "fee_head_code",
        "fee_head_name",
        "description",
        "billing_month",
        "gross_amount",
        "discount_amount",
        "discount_kind",
        "net_amount",
        "remarks",
      ],
      summaryRows: [
        "subtotal_gross",
        "total_discount",
        "total_net",
        "total_paid",
        "balance_due",
        "advance_credit",
        "amount_in_words",
      ],
      showAmountInWords: true,
      groupByFeeHead: false,
    },
    footer: {
      fields: [
        "payment_instructions",
        "bank_name",
        "bank_account",
        "bank_ifsc",
        "upi_id",
        "footer_notes",
        "terms_and_conditions",
        "authorized_signatory",
        "parent_signature",
        "generated_at",
      ],
      showSignatureBlocks: true,
    },
  };
}

export function amountInWordsRupees(amount: number): string {
  if (amount === 0) return "Zero Rupees Only";
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function twoDigits(n: number): string {
    if (n < 20) return ones[n] ?? "";
    return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`.trim();
  }

  function threeDigits(n: number): string {
    if (n >= 100) {
      return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${twoDigits(n % 100)}` : ""}`.trim();
    }
    return twoDigits(n);
  }

  let n = amount;
  const crore = Math.floor(n / 10_000_000);
  n %= 10_000_000;
  const lakh = Math.floor(n / 100_000);
  n %= 100_000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundredPart = n;

  const parts: string[] = [];
  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundredPart) parts.push(threeDigits(hundredPart));

  return `${parts.join(" ")} Rupees Only`;
}
