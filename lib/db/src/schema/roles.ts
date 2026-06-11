import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { entityStatusEnum, roleScopeEnum } from "./enums";

export const rolesTable = pgTable(
  "roles",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    scope: roleScopeEnum("scope").notNull(),
    isSystem: boolean("is_system").notNull().default(true),
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
    statusIdx: index("roles_status_idx").on(table.status),
  }),
);

export const permissionsTable = pgTable(
  "permissions",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull().unique(),
    module: text("module").notNull(),
    action: text("action").notNull(),
    description: text("description"),
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
    moduleActionUq: uniqueIndex("permissions_module_action_uq").on(
      table.module,
      table.action,
    ),
  }),
);

export const rolePermissionsTable = pgTable(
  "role_permissions",
  {
    id: serial("id").primaryKey(),
    roleId: integer("role_id")
      .notNull()
      .references(() => rolesTable.id, { onDelete: "cascade" }),
    permissionId: integer("permission_id")
      .notNull()
      .references(() => permissionsTable.id, { onDelete: "cascade" }),
    isAllowed: boolean("is_allowed").notNull().default(true),
    constraints: jsonb("constraints").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: integer("created_by"),
    updatedBy: integer("updated_by"),
  },
  (table) => ({
    rolePermissionUq: uniqueIndex("role_permissions_role_permission_uq").on(
      table.roleId,
      table.permissionId,
    ),
    roleIdx: index("role_permissions_role_idx").on(table.roleId),
  }),
);
