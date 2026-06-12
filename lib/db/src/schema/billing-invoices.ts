import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { academicSessionsTable } from "./academic-sessions";
import { invoiceStatusEnum } from "./enums";
import { billingRunsTable, studentFeeAssignmentsTable } from "./billing-config";
import { branchesTable } from "./branches";
import { financialSessionsTable } from "./financial-sessions";
import { feeHeadsTable, feeStructuresTable } from "./fee-structures";
import { schoolsTable } from "./schools";
import { societiesTable } from "./societies";
import { studentsTable } from "./students";
import { usersTable } from "./users";

export type InvoiceLayoutConfigJson = {
  header: {
    fields: string[];
    showLogo?: boolean;
    customLines?: string[];
  };
  middle: {
    columns: string[];
    summaryRows: string[];
    showAmountInWords?: boolean;
    groupByFeeHead?: boolean;
  };
  footer: {
    fields: string[];
    showSignatureBlocks?: boolean;
  };
};

export const invoiceTemplatesTable = pgTable(
  "invoice_templates",
  {
    id: serial("id").primaryKey(),
    branchId: integer("branch_id")
      .notNull()
      .references(() => branchesTable.id, { onDelete: "cascade" }),
    sessionId: integer("session_id").references(() => academicSessionsTable.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    title: text("title").notNull().default("FEE BILL / CHALLAN"),
    layoutConfig: jsonb("layout_config").$type<InvoiceLayoutConfigJson>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: integer("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  },
  (table) => ({
    branchSessionNameUq: uniqueIndex("invoice_templates_branch_session_name_uq").on(
      table.branchId,
      table.sessionId,
      table.name,
    ),
    branchIdx: index("invoice_templates_branch_idx").on(table.branchId),
  }),
);

export const billingSettingsTable = pgTable(
  "billing_settings",
  {
    id: serial("id").primaryKey(),
    branchId: integer("branch_id")
      .notNull()
      .references(() => branchesTable.id, { onDelete: "cascade" }),
    sessionId: integer("session_id")
      .notNull()
      .references(() => academicSessionsTable.id, { onDelete: "cascade" }),
    invoiceTemplateId: integer("invoice_template_id").references(() => invoiceTemplatesTable.id, {
      onDelete: "set null",
    }),
    invoicePrefix: text("invoice_prefix"),
    paymentInstructions: text("payment_instructions"),
    bankName: text("bank_name"),
    bankAccount: text("bank_account"),
    bankIfsc: text("bank_ifsc"),
    upiId: text("upi_id"),
    footerNotes: text("footer_notes"),
    termsAndConditions: text("terms_and_conditions"),
    authorizedSignatory: text("authorized_signatory"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    updatedBy: integer("updated_by").references(() => usersTable.id, { onDelete: "set null" }),
  },
  (table) => ({
    branchSessionUq: uniqueIndex("billing_settings_branch_session_uq").on(
      table.branchId,
      table.sessionId,
    ),
  }),
);

export const invoicesTable = pgTable(
  "invoices",
  {
    id: serial("id").primaryKey(),
    societyId: integer("society_id")
      .notNull()
      .references(() => societiesTable.id, { onDelete: "cascade" }),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schoolsTable.id, { onDelete: "cascade" }),
    branchId: integer("branch_id")
      .notNull()
      .references(() => branchesTable.id, { onDelete: "cascade" }),
    sessionId: integer("session_id")
      .notNull()
      .references(() => academicSessionsTable.id, { onDelete: "cascade" }),
    financialSessionId: integer("financial_session_id").references(() => financialSessionsTable.id, {
      onDelete: "set null",
    }),
    studentId: integer("student_id")
      .notNull()
      .references(() => studentsTable.id, { onDelete: "cascade" }),
    invoiceNumber: text("invoice_number").notNull(),
    billingPeriodStart: date("billing_period_start").notNull(),
    billingPeriodEnd: date("billing_period_end").notNull(),
    billingPeriodLabel: text("billing_period_label").notNull(),
    dueDate: date("due_date").notNull(),
    status: invoiceStatusEnum("status").notNull().default("published"),
    totalGross: integer("total_gross").notNull(),
    totalDiscount: integer("total_discount").notNull().default(0),
    totalNet: integer("total_net").notNull(),
    totalPaid: integer("total_paid").notNull().default(0),
    billingRunId: integer("billing_run_id").references(() => billingRunsTable.id, {
      onDelete: "set null",
    }),
    invoiceTemplateId: integer("invoice_template_id").references(() => invoiceTemplatesTable.id, {
      onDelete: "set null",
    }),
    billbookSnapshot: jsonb("billbook_snapshot").$type<Record<string, unknown>>(),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: integer("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  },
  (table) => ({
    branchSessionStudentIdx: index("invoices_branch_session_student_idx").on(
      table.branchId,
      table.sessionId,
      table.studentId,
    ),
    branchSessionStatusDueIdx: index("invoices_branch_session_status_due_idx").on(
      table.branchId,
      table.sessionId,
      table.status,
      table.dueDate,
    ),
    idempotencyUq: uniqueIndex("invoices_branch_idempotency_uq").on(table.branchId, table.idempotencyKey),
  }),
);

export const invoiceItemsTable = pgTable(
  "invoice_items",
  {
    id: serial("id").primaryKey(),
    invoiceId: integer("invoice_id")
      .notNull()
      .references(() => invoicesTable.id, { onDelete: "cascade" }),
    feeHeadId: integer("fee_head_id")
      .notNull()
      .references(() => feeHeadsTable.id, { onDelete: "restrict" }),
    description: text("description").notNull(),
    grossAmount: integer("gross_amount").notNull(),
    discountAmount: integer("discount_amount").notNull().default(0),
    discountKind: text("discount_kind"),
    netAmount: integer("net_amount").notNull(),
    paidAmount: integer("paid_amount").notNull().default(0),
    feeStructureId: integer("fee_structure_id").references(() => feeStructuresTable.id, {
      onDelete: "set null",
    }),
    studentFeeAssignmentId: integer("student_fee_assignment_id").references(
      () => studentFeeAssignmentsTable.id,
      { onDelete: "set null" },
    ),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    invoiceIdx: index("invoice_items_invoice_idx").on(table.invoiceId),
    feeHeadIdx: index("invoice_items_fee_head_idx").on(table.feeHeadId),
  }),
);
