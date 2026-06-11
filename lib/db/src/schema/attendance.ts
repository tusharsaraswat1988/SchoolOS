import { date, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { academicSessionsTable } from "./academic-sessions";
import { branchesTable } from "./branches";
import { classesTable } from "./classes";
import { attendanceStatusEnum } from "./enums";
import { schoolsTable } from "./schools";
import { sectionsTable } from "./sections";
import { societiesTable } from "./societies";
import { studentsTable } from "./students";

export const attendanceRecordsTable = pgTable(
  "attendance_records",
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
    classId: integer("class_id")
      .notNull()
      .references(() => classesTable.id, { onDelete: "cascade" }),
    sectionId: integer("section_id")
      .notNull()
      .references(() => sectionsTable.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => studentsTable.id, { onDelete: "cascade" }),
    attendanceDate: date("attendance_date").notNull(),
    status: attendanceStatusEnum("status").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: integer("created_by"),
    updatedBy: integer("updated_by"),
  },
  (table) => ({
    studentDateUq: uniqueIndex("attendance_records_student_date_uq").on(
      table.studentId,
      table.attendanceDate,
    ),
    sessionDateIdx: index("attendance_records_session_date_idx").on(
      table.sessionId,
      table.attendanceDate,
    ),
  }),
);
