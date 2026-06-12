import { boolean, date, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { academicSessionsTable } from "./academic-sessions";
import { ledgerDirectionEnum, ledgerEntryTypeEnum } from "./enums";
import { feeHeadsTable } from "./fee-structures";
import { invoicesTable, invoiceItemsTable } from "./billing-invoices";
import { branchesTable } from "./branches";
import { schoolsTable } from "./schools";
import { societiesTable } from "./societies";
import { studentsTable } from "./students";
import { usersTable } from "./users";

export const ledgerEntriesTable = pgTable(
  "ledger_entries",
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
    studentId: integer("student_id")
      .notNull()
      .references(() => studentsTable.id, { onDelete: "cascade" }),
    entryType: ledgerEntryTypeEnum("entry_type").notNull(),
    direction: ledgerDirectionEnum("direction").notNull(),
    amount: integer("amount").notNull(),
    feeHeadId: integer("fee_head_id").references(() => feeHeadsTable.id, { onDelete: "set null" }),
    invoiceId: integer("invoice_id").references(() => invoicesTable.id, { onDelete: "set null" }),
    invoiceItemId: integer("invoice_item_id").references(() => invoiceItemsTable.id, {
      onDelete: "set null",
    }),
    paymentId: integer("payment_id"),
    referenceEntryId: integer("reference_entry_id"),
    entryDate: date("entry_date").notNull(),
    narration: text("narration").notNull(),
    isVoid: boolean("is_void").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: integer("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  },
  (table) => ({
    studentDateIdx: index("ledger_entries_branch_student_date_idx").on(
      table.branchId,
      table.studentId,
      table.entryDate,
    ),
    sessionTypeIdx: index("ledger_entries_branch_session_type_idx").on(
      table.branchId,
      table.sessionId,
      table.entryType,
    ),
    paymentIdx: index("ledger_entries_payment_idx").on(table.paymentId),
    invoiceIdx: index("ledger_entries_invoice_idx").on(table.invoiceId),
  }),
);
