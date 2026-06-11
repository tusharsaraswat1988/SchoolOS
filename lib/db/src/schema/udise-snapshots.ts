import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { udiseExportStatusEnum } from "./enums";
import { schoolsTable } from "./schools";

export const udiseSnapshotsTable = pgTable(
  "udise_snapshots",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schoolsTable.id, { onDelete: "cascade" }),
    academicYear: text("academic_year").notNull(),
    profileSnapshot: jsonb("profile_snapshot").$type<Record<string, unknown> | null>(),
    enrollmentSnapshot: jsonb("enrollment_snapshot").$type<Record<string, unknown> | null>(),
    staffSnapshot: jsonb("staff_snapshot").$type<Record<string, unknown> | null>(),
    infrastructureSnapshot: jsonb("infrastructure_snapshot").$type<Record<string, unknown> | null>(),
    exportReadyStatus: udiseExportStatusEnum("export_ready_status").notNull().default("draft"),
    compliancePercentage: numeric("compliance_percentage", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: integer("created_by"),
    updatedBy: integer("updated_by"),
  },
  (table) => ({
    schoolYearUq: uniqueIndex("udise_snapshots_school_year_uq").on(table.schoolId, table.academicYear),
    schoolIdx: index("udise_snapshots_school_idx").on(table.schoolId),
  }),
);
