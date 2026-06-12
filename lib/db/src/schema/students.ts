import { boolean, date, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { academicSessionsTable } from "./academic-sessions";
import { branchesTable } from "./branches";
import { classesTable } from "./classes";
import { genderEnum, relationshipEnum, socialCategoryEnum, studentStatusEnum } from "./enums";
import { schoolsTable } from "./schools";
import { sectionsTable } from "./sections";
import { societiesTable } from "./societies";
import { usersTable } from "./users";

export const studentsTable = pgTable(
  "students",
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
      .references(() => classesTable.id, { onDelete: "restrict" }),
    billingClassId: integer("billing_class_id").references(() => classesTable.id, {
      onDelete: "set null",
    }),
    billingClassEffectiveFrom: date("billing_class_effective_from"),
    sectionId: integer("section_id")
      .notNull()
      .references(() => sectionsTable.id, { onDelete: "restrict" }),
    admissionNumber: text("admission_number").notNull(),
    registrationNumber: text("registration_number"),
    rollNumber: text("roll_number"),
    firstName: text("first_name").notNull(),
    middleName: text("middle_name"),
    lastName: text("last_name").notNull(),
    dob: date("dob").notNull(),
    gender: genderEnum("gender").notNull(),
    bloodGroup: text("blood_group"),
    photoUrl: text("photo_url"),
    signatureUrl: text("signature_url"),
    fatherName: text("father_name").notNull(),
    motherName: text("mother_name").notNull(),
    guardianName: text("guardian_name"),
    parentMobile: text("parent_mobile").notNull(),
    parentEmail: text("parent_email").notNull(),
    address: text("address").notNull(),
    socialCategory: socialCategoryEnum("social_category"),
    religion: text("religion"),
    nationality: text("nationality"),
    aadhaar: text("aadhaar"),
    penNumber: text("pen_number"),
    apaarId: text("apaar_id"),
    udiseStudentId: text("udise_student_id"),
    isRteStudent: boolean("is_rte_student").notNull().default(false),
    isCwsnStudent: boolean("is_cwsn_student").notNull().default(false),
    house: text("house"),
    admissionDate: date("admission_date"),
    transportAssigned: boolean("transport_assigned").notNull().default(false),
    healthRecordId: integer("health_record_id"),
    status: studentStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: integer("created_by"),
    updatedBy: integer("updated_by"),
  },
  (table) => ({
    admissionUq: uniqueIndex("students_admission_number_uq").on(table.admissionNumber),
    registrationUq: uniqueIndex("students_registration_number_uq").on(table.registrationNumber),
    sectionIdx: index("students_section_idx").on(table.sectionId),
  }),
);

export const parentsTable = pgTable(
  "parents",
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
    studentId: integer("student_id")
      .notNull()
      .references(() => studentsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    relationship: relationshipEnum("relationship").notNull(),
    isPrimary: boolean("is_primary").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: integer("created_by"),
    updatedBy: integer("updated_by"),
  },
  (table) => ({
    studentParentUq: uniqueIndex("parents_student_user_uq").on(table.studentId, table.userId),
    userIdx: index("parents_user_idx").on(table.userId),
  }),
);
