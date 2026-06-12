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
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { branchesTable } from "./branches";
import { otpChannelEnum, otpPurposeEnum, otpStatusEnum, userStatusEnum } from "./enums";
import { permissionsTable, rolesTable } from "./roles";
import { schoolsTable } from "./schools";
import { societiesTable } from "./societies";
import { studentsTable } from "./students";

export const usersTable = pgTable(
  "users",
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
    roleId: integer("role_id")
      .notNull()
      .references(() => rolesTable.id, { onDelete: "restrict" }),
    userCode: text("user_code"),
    passwordHash: text("password_hash"),
    name: text("name").notNull(),
    mobile: text("mobile").notNull(),
    email: text("email"),
    studentId: integer("student_id").references((): AnyPgColumn => studentsTable.id, {
      onDelete: "set null",
    }),
    status: userStatusEnum("status").notNull().default("active"),
    otpBypassCode: text("otp_bypass_code"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: integer("created_by"),
    updatedBy: integer("updated_by"),
  },
  (table) => ({
    mobileUq: uniqueIndex("users_mobile_uq").on(table.mobile),
    userCodeUq: uniqueIndex("users_user_code_uq").on(table.userCode),
    emailIdx: index("users_email_idx").on(table.email),
    studentIdx: index("users_student_id_idx").on(table.studentId),
    scopeIdx: index("users_scope_idx").on(table.societyId, table.schoolId, table.branchId),
  }),
);

export const userPermissionsTable = pgTable(
  "user_permissions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
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
    userPermissionUq: uniqueIndex("user_permissions_user_permission_uq").on(
      table.userId,
      table.permissionId,
    ),
  }),
);

export const otpLoginEventsTable = pgTable(
  "otp_login_events",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
    mobile: text("mobile").notNull(),
    purpose: otpPurposeEnum("purpose").notNull().default("login"),
    channel: otpChannelEnum("channel").notNull().default("sms"),
    otpHash: text("otp_hash").notNull(),
    status: otpStatusEnum("status").notNull().default("issued"),
    provider: text("provider").notNull().default("dev-provider"),
    providerMessageId: text("provider_message_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    mobileIdx: index("otp_login_events_mobile_idx").on(table.mobile),
    statusIdx: index("otp_login_events_status_idx").on(table.status),
    expiryIdx: index("otp_login_events_expiry_idx").on(table.expiresAt),
  }),
);
