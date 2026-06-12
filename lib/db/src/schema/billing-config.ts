import { boolean, date, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { academicSessionsTable } from "./academic-sessions";
import { billingRunStatusEnum, discountKindEnum, sequenceTypeEnum } from "./enums";
import { branchesTable } from "./branches";
import { feeHeadsTable } from "./fee-structures";
import { schoolsTable } from "./schools";
import { societiesTable } from "./societies";
import { studentsTable } from "./students";
import { usersTable } from "./users";

export const numberSequencesTable = pgTable(
  "number_sequences",
  {
    id: serial("id").primaryKey(),
    branchId: integer("branch_id")
      .notNull()
      .references(() => branchesTable.id, { onDelete: "cascade" }),
    sessionId: integer("session_id").references(() => academicSessionsTable.id, {
      onDelete: "cascade",
    }),
    sequenceType: sequenceTypeEnum("sequence_type").notNull(),
    prefix: text("prefix").notNull(),
    nextValue: integer("next_value").notNull().default(1),
    padding: integer("padding").notNull().default(4),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    branchSessionTypeUq: uniqueIndex("number_sequences_branch_session_type_uq").on(
      table.branchId,
      table.sessionId,
      table.sequenceType,
    ),
  }),
);

export const billingRunsTable = pgTable(
  "billing_runs",
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
    billingPeriodStart: date("billing_period_start").notNull(),
    billingPeriodEnd: date("billing_period_end").notNull(),
    billingPeriodLabel: text("billing_period_label").notNull(),
    status: billingRunStatusEnum("status").notNull().default("pending"),
    totalStudents: integer("total_students").notNull().default(0),
    invoicesCreated: integer("invoices_created").notNull().default(0),
    invoicesSkipped: integer("invoices_skipped").notNull().default(0),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdBy: integer("created_by").references(() => usersTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    branchSessionPeriodUq: uniqueIndex("billing_runs_branch_session_period_uq").on(
      table.branchId,
      table.sessionId,
      table.billingPeriodStart,
    ),
    branchSessionIdx: index("billing_runs_branch_session_idx").on(table.branchId, table.sessionId),
  }),
);

export const studentFeeAssignmentsTable = pgTable(
  "student_fee_assignments",
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
    feeHeadId: integer("fee_head_id")
      .notNull()
      .references(() => feeHeadsTable.id, { onDelete: "cascade" }),
    overrideAmount: integer("override_amount"),
    discountKind: discountKindEnum("discount_kind"),
    discountValue: integer("discount_value"),
    isExcluded: boolean("is_excluded").notNull().default(false),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: integer("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  },
  (table) => ({
    studentSessionHeadFromIdx: index("student_fee_assignments_student_session_head_from_idx").on(
      table.studentId,
      table.sessionId,
      table.feeHeadId,
      table.effectiveFrom,
    ),
  }),
);
