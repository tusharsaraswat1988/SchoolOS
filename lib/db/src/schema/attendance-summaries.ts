import { index, integer, pgTable, serial, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { academicSessionsTable } from "./academic-sessions";
import { branchesTable } from "./branches";
import { classesTable } from "./classes";
import { schoolsTable } from "./schools";
import { societiesTable } from "./societies";

export const attendanceMonthlySummariesTable = pgTable(
  "attendance_monthly_summaries",
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
    classId: integer("class_id").references(() => classesTable.id, { onDelete: "cascade" }),
    month: integer("month").notNull(),
    year: integer("year").notNull(),
    workingDays: integer("working_days").notNull().default(0),
    presentDays: integer("present_days").notNull().default(0),
    absentDays: integer("absent_days").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    scopeMonthUq: uniqueIndex("attendance_monthly_scope_uq").on(
      table.branchId,
      table.sessionId,
      table.classId,
      table.month,
      table.year,
    ),
    branchIdx: index("attendance_monthly_branch_idx").on(table.branchId),
  }),
);
