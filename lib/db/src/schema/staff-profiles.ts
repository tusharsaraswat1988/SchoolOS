import { date, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { appointmentTypeEnum, genderEnum, staffTypeEnum } from "./enums";
import { usersTable } from "./users";

export const staffProfilesTable = pgTable(
  "staff_profiles",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    employeeId: text("employee_id"),
    email: text("email"),
    gender: genderEnum("gender"),
    dob: date("dob"),
    joiningDate: date("joining_date"),
    designation: text("designation"),
    staffType: staffTypeEnum("staff_type"),
    qualification: text("qualification"),
    professionalQualification: text("professional_qualification"),
    subjectsTaught: jsonb("subjects_taught").$type<string[] | null>(),
    appointmentType: appointmentTypeEnum("appointment_type"),
    salaryReference: text("salary_reference"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: integer("created_by"),
    updatedBy: integer("updated_by"),
  },
  (table) => ({
    userUq: uniqueIndex("staff_profiles_user_uq").on(table.userId),
    employeeIdIdx: index("staff_profiles_employee_id_idx").on(table.employeeId),
  }),
);
