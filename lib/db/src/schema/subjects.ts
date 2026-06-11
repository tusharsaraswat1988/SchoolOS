import { boolean, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { entityStatusEnum } from "./enums";
import { academicSessionsTable } from "./academic-sessions";
import { branchesTable } from "./branches";
import { classesTable } from "./classes";
import { schoolsTable } from "./schools";
import { societiesTable } from "./societies";
import { usersTable } from "./users";

export const subjectsTable = pgTable(
  "subjects",
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
    sessionCodeUq: uniqueIndex("subjects_session_code_uq").on(table.sessionId, table.code),
    branchIdx: index("subjects_branch_idx").on(table.branchId),
  }),
);

export const classSubjectsTable = pgTable(
  "class_subjects",
  {
    id: serial("id").primaryKey(),
    classId: integer("class_id")
      .notNull()
      .references(() => classesTable.id, { onDelete: "cascade" }),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjectsTable.id, { onDelete: "cascade" }),
    isMandatory: boolean("is_mandatory").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: integer("created_by"),
  },
  (table) => ({
    classSubjectUq: uniqueIndex("class_subjects_class_subject_uq").on(table.classId, table.subjectId),
  }),
);

export const teacherSubjectsTable = pgTable(
  "teacher_subjects",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjectsTable.id, { onDelete: "cascade" }),
    classId: integer("class_id").references(() => classesTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: integer("created_by"),
  },
  (table) => ({
    teacherSubjectClassUq: uniqueIndex("teacher_subjects_user_subject_class_uq").on(
      table.userId,
      table.subjectId,
      table.classId,
    ),
  }),
);
