import { pgTable, text, serial, timestamp, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";

export const activityTypeEnum = pgEnum("activity_type", ["admission", "payment", "attendance", "announcement", "staff_added"]);

export const activityTable = pgTable("activity", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schoolsTable.id),
  type: activityTypeEnum("type").notNull(),
  description: text("description").notNull(),
  actorName: text("actor_name"),
  targetName: text("target_name"),
  amount: numeric("amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activityTable).omit({ id: true, createdAt: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activityTable.$inferSelect;
