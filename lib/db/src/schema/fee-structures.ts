import { date, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { entityStatusEnum } from "./enums";
import { academicSessionsTable } from "./academic-sessions";
import { financialSessionsTable } from "./financial-sessions";
import { branchesTable } from "./branches";
import { classesTable } from "./classes";
import { schoolsTable } from "./schools";
import { societiesTable } from "./societies";

export const feeHeadsTable = pgTable(
  "fee_heads",
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
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    status: entityStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: integer("created_by"),
    updatedBy: integer("updated_by"),
  },
  (table) => ({
    branchCodeUq: uniqueIndex("fee_heads_branch_code_uq").on(table.branchId, table.code),
  }),
);

export const feeStructuresTable = pgTable(
  "fee_structures",
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
      onDelete: "cascade",
    }),
    classId: integer("class_id")
      .notNull()
      .references(() => classesTable.id, { onDelete: "cascade" }),
    feeHeadId: integer("fee_head_id")
      .notNull()
      .references(() => feeHeadsTable.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    dueDayOfMonth: integer("due_day_of_month"),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    billingMonths: integer("billing_months").array(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: integer("created_by"),
    updatedBy: integer("updated_by"),
  },
  (table) => ({
    classHeadEffectiveUq: uniqueIndex("fee_structures_class_head_effective_uq").on(
      table.sessionId,
      table.classId,
      table.feeHeadId,
      table.effectiveFrom,
    ),
    branchIdx: index("fee_structures_branch_idx").on(table.branchId),
  }),
);

