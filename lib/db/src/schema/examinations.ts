import { boolean, date, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { examAssessmentModeEnum } from "./enums";
import { academicSessionsTable } from "./academic-sessions";
import { branchesTable } from "./branches";
import { classesTable } from "./classes";
import { schoolsTable } from "./schools";
import { societiesTable } from "./societies";
import { studentsTable } from "./students";

export const examTypesTable = pgTable(
  "exam_types",
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
    assessmentMode: examAssessmentModeEnum("assessment_mode").notNull().default("marks"),
    isTermExam: boolean("is_term_exam").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: integer("created_by"),
    updatedBy: integer("updated_by"),
  },
  (table) => ({
    sessionCodeUq: uniqueIndex("exam_types_session_code_uq").on(table.sessionId, table.code),
  }),
);

export const examsTable = pgTable(
  "exams",
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
    examTypeId: integer("exam_type_id")
      .notNull()
      .references(() => examTypesTable.id, { onDelete: "restrict" }),
    classId: integer("class_id")
      .notNull()
      .references(() => classesTable.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    examDate: date("exam_date").notNull(),
    maxMarks: integer("max_marks"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: integer("created_by"),
    updatedBy: integer("updated_by"),
  },
  (table) => ({
    branchSessionIdx: index("exams_branch_session_idx").on(table.branchId, table.sessionId),
  }),
);

export const examResultsTable = pgTable(
  "exam_results",
  {
    id: serial("id").primaryKey(),
    examId: integer("exam_id")
      .notNull()
      .references(() => examsTable.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => studentsTable.id, { onDelete: "cascade" }),
    marksObtained: integer("marks_obtained"),
    grade: text("grade"),
    remarks: text("remarks"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: integer("created_by"),
    updatedBy: integer("updated_by"),
  },
  (table) => ({
    examStudentUq: uniqueIndex("exam_results_exam_student_uq").on(table.examId, table.studentId),
  }),
);
