import { date, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { attendanceStatusEnum } from "./enums";
import { branchesTable } from "./branches";
import { schoolsTable } from "./schools";
import { societiesTable } from "./societies";
import { usersTable } from "./users";

export const staffAttendanceRecordsTable = pgTable(
  "staff_attendance_records",
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
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    attendanceDate: date("attendance_date").notNull(),
    status: attendanceStatusEnum("status").notNull().default("present"),
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
    userDateUq: uniqueIndex("staff_attendance_user_date_uq").on(table.userId, table.attendanceDate),
    branchDateIdx: index("staff_attendance_branch_date_idx").on(table.branchId, table.attendanceDate),
  }),
);
