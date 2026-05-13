import { pgTable, text, serial, timestamp, integer, date, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";

export const staffRoleEnum = pgEnum("staff_role", ["teacher", "principal", "accountant", "admin", "support"]);
export const staffStatusEnum = pgEnum("staff_status", ["active", "inactive"]);

export const staffTable = pgTable("staff", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: staffRoleEnum("role").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject"),
  qualification: text("qualification"),
  photoUrl: text("photo_url"),
  schoolId: integer("school_id").notNull().references(() => schoolsTable.id),
  status: staffStatusEnum("status").notNull().default("active"),
  joinDate: date("join_date"),
  salary: numeric("salary", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertStaffSchema = createInsertSchema(staffTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type StaffMember = typeof staffTable.$inferSelect;
