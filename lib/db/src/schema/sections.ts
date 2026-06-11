import { check, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { branchesTable } from "./branches";
import { classesTable } from "./classes";
import { entityStatusEnum } from "./enums";
import { schoolsTable } from "./schools";
import { societiesTable } from "./societies";
import { usersTable } from "./users";

export const sectionsTable = pgTable(
  "sections",
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
    classId: integer("class_id")
      .notNull()
      .references(() => classesTable.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    capacity: integer("capacity").notNull().default(50),
    coordinatorUserId: integer("coordinator_user_id").references(() => usersTable.id, {
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
    sectionPerClassUq: uniqueIndex("sections_class_code_uq").on(table.classId, table.code),
    capacityPositiveChk: check(
      "sections_capacity_positive_chk",
      sql`${table.capacity} > 0`,
    ),
  }),
);
