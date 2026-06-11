import { boolean, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { entityStatusEnum } from "./enums";
import { schoolsTable } from "./schools";
import { societiesTable } from "./societies";

export const branchesTable = pgTable(
  "branches",
  {
    id: serial("id").primaryKey(),
    societyId: integer("society_id")
      .notNull()
      .references(() => societiesTable.id, { onDelete: "cascade" }),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schoolsTable.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    timezone: text("timezone").notNull().default("Asia/Kolkata"),
    isMain: boolean("is_main").notNull().default(false),
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
    codePerSchoolUq: uniqueIndex("branches_school_code_uq").on(table.schoolId, table.code),
    schoolIdx: index("branches_school_idx").on(table.schoolId),
    societyIdx: index("branches_society_idx").on(table.societyId),
  }),
);
