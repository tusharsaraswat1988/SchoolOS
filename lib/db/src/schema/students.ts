import { pgTable, text, serial, timestamp, integer, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";
import { classesTable } from "./classes";

export const studentStatusEnum = pgEnum("student_status", ["active", "inactive", "graduated", "transferred"]);
export const genderEnum = pgEnum("gender", ["male", "female", "other"]);

export const studentsTable = pgTable("students", {
  id: serial("id").primaryKey(),
  admissionNumber: text("admission_number").notNull(),
  rollNumber: text("roll_number"),
  firstName: text("first_name").notNull(),
  middleName: text("middle_name"),
  lastName: text("last_name").notNull(),
  gender: genderEnum("gender").notNull(),
  dateOfBirth: date("date_of_birth"),
  bloodGroup: text("blood_group"),
  category: text("category"),
  photoUrl: text("photo_url"),
  classId: integer("class_id").notNull().references(() => classesTable.id),
  section: text("section"),
  schoolId: integer("school_id").notNull().references(() => schoolsTable.id),
  fatherName: text("father_name"),
  motherName: text("mother_name"),
  parentPhone: text("parent_phone"),
  parentEmail: text("parent_email"),
  address: text("address"),
  status: studentStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertStudentSchema = createInsertSchema(studentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof studentsTable.$inferSelect;
