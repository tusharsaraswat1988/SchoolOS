import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { entityStatusEnum } from "./enums";
import { branchesTable } from "./branches";
import { schoolsTable } from "./schools";
import { societiesTable } from "./societies";

export const academicSessionsTable = pgTable(
  "academic_sessions",
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
    code: text("code").notNull(),
    name: text("name").notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    isCurrent: boolean("is_current").notNull().default(false),
    defaultFeeDueDay: integer("default_fee_due_day").notNull().default(10),
    prorateMidMonthAdmission: boolean("prorate_mid_month_admission").notNull().default(true),
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
    codePerBranchUq: uniqueIndex("academic_sessions_branch_code_uq").on(
      table.branchId,
      table.code,
    ),
    branchIdx: index("academic_sessions_branch_idx").on(table.branchId),
    dateOrderChk: check(
      "academic_sessions_starts_before_ends_chk",
      sql`${table.startsOn} < ${table.endsOn}`,
    ),
  }),
);
