import { pgTable, text, serial, timestamp, integer, date, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";
import { studentsTable } from "./students";

export const feeStatusEnum = pgEnum("fee_status", ["pending", "paid", "overdue", "partial"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "online", "cheque", "upi", "card"]);

export const feeRecordsTable = pgTable("fee_records", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id),
  schoolId: integer("school_id").notNull().references(() => schoolsTable.id),
  feeType: text("fee_type").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  status: feeStatusEnum("status").notNull().default("pending"),
  dueDate: date("due_date").notNull(),
  paidDate: date("paid_date"),
  receiptNumber: text("receipt_number"),
  paymentMethod: paymentMethodEnum("payment_method"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFeeRecordSchema = createInsertSchema(feeRecordsTable).omit({ id: true, createdAt: true, updatedAt: true, paidAmount: true, status: true, paidDate: true, receiptNumber: true, paymentMethod: true });
export type InsertFeeRecord = z.infer<typeof insertFeeRecordSchema>;
export type FeeRecord = typeof feeRecordsTable.$inferSelect;
