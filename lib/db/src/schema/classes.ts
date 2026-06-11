import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { academicSessionsTable } from "./academic-sessions";
import { branchesTable } from "./branches";
import { entityStatusEnum } from "./enums";
import { schoolsTable } from "./schools";
import { societiesTable } from "./societies";
import { usersTable } from "./users";

export const classesTable = pgTable(
  "classes",
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
    code: text("code").notNull(),
    name: text("name").notNull(),
    gradeOrder: integer("grade_order"),
    classTeacherUserId: integer("class_teacher_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
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
    classPerSessionUq: uniqueIndex("classes_session_code_uq").on(table.sessionId, table.code),
    branchIdx: index("classes_branch_idx").on(table.branchId),
  }),
);
