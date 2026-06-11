import { date, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { academicSessionsTable } from "./academic-sessions";
import { branchesTable } from "./branches";
import { feeStatusEnum, paymentMethodEnum } from "./enums";
import { schoolsTable } from "./schools";
import { societiesTable } from "./societies";
import { studentsTable } from "./students";

export const feeRecordsTable = pgTable(
  "fee_records",
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
    feeType: text("fee_type").notNull(),
    amount: integer("amount").notNull(),
    paidAmount: integer("paid_amount").notNull().default(0),
    discount: integer("discount").notNull().default(0),
    status: feeStatusEnum("status").notNull().default("pending"),
    dueDate: date("due_date").notNull(),
    paidDate: date("paid_date"),
    receiptNumber: text("receipt_number"),
    paymentMethod: paymentMethodEnum("payment_method"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: integer("created_by"),
    updatedBy: integer("updated_by"),
  },
  (table) => ({
    studentDueDateIdx: index("fee_records_student_due_idx").on(table.studentId, table.dueDate),
  }),
);
