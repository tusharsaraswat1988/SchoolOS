import { index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { auditActionEnum } from "./enums";
import { branchesTable } from "./branches";
import { schoolsTable } from "./schools";
import { societiesTable } from "./societies";
import { usersTable } from "./users";

export const auditLogsTable = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    societyId: integer("society_id").references(() => societiesTable.id, {
      onDelete: "set null",
    }),
    schoolId: integer("school_id").references(() => schoolsTable.id, {
      onDelete: "set null",
    }),
    branchId: integer("branch_id").references(() => branchesTable.id, {
      onDelete: "set null",
    }),
    actorUserId: integer("actor_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    action: auditActionEnum("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    entityLabel: text("entity_label"),
    oldValue: jsonb("old_value").$type<Record<string, unknown> | null>(),
    newValue: jsonb("new_value").$type<Record<string, unknown> | null>(),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    actorIdx: index("audit_logs_actor_idx").on(table.actorUserId),
    entityIdx: index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    scopeIdx: index("audit_logs_scope_idx").on(table.societyId, table.schoolId, table.branchId),
  }),
);
