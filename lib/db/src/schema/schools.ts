import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const schoolStatusEnum = pgEnum("school_status", ["active", "inactive", "suspended"]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", ["basic", "standard", "premium", "enterprise"]);

export const schoolsTable = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  phone: text("phone"),
  email: text("email"),
  principalName: text("principal_name"),
  logoUrl: text("logo_url"),
  status: schoolStatusEnum("status").notNull().default("active"),
  subscriptionPlan: subscriptionPlanEnum("subscription_plan").notNull().default("basic"),
  studentCount: integer("student_count").notNull().default(0),
  staffCount: integer("staff_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSchoolSchema = createInsertSchema(schoolsTable).omit({ id: true, createdAt: true, updatedAt: true, studentCount: true, staffCount: true });
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schoolsTable.$inferSelect;
