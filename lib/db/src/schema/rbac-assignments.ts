import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { academicSessionsTable } from "./academic-sessions";
import { branchesTable } from "./branches";
import { classesTable } from "./classes";
import { restrictionEntityTypeEnum } from "./enums";
import { rolesTable } from "./roles";
import { schoolsTable } from "./schools";
import { sectionsTable } from "./sections";
import { societiesTable } from "./societies";
import { studentsTable } from "./students";
import { usersTable } from "./users";

export const userRoleAssignmentsTable = pgTable(
  "user_role_assignments",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    roleId: integer("role_id")
      .notNull()
      .references(() => rolesTable.id, { onDelete: "cascade" }),
    societyId: integer("society_id").references(() => societiesTable.id, {
      onDelete: "cascade",
    }),
    schoolId: integer("school_id").references(() => schoolsTable.id, {
      onDelete: "cascade",
    }),
    branchId: integer("branch_id").references(() => branchesTable.id, {
      onDelete: "cascade",
    }),
    isPrimary: boolean("is_primary").notNull().default(false),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdx: index("user_role_assignments_user_idx").on(table.userId),
    roleIdx: index("user_role_assignments_role_idx").on(table.roleId),
    branchIdx: index("user_role_assignments_branch_idx").on(table.branchId),
    scopeIdx: index("user_role_assignments_scope_idx").on(
      table.societyId,
      table.schoolId,
      table.branchId,
    ),
    hasScopeChk: check(
      "user_role_assignments_has_scope_chk",
      sql`${table.societyId} IS NOT NULL OR ${table.schoolId} IS NOT NULL OR ${table.branchId} IS NOT NULL`,
    ),
  }),
);

export const roleBranchRestrictionsTable = pgTable(
  "role_branch_restrictions",
  {
    id: serial("id").primaryKey(),
    assignmentId: integer("assignment_id")
      .notNull()
      .references(() => userRoleAssignmentsTable.id, { onDelete: "cascade" }),
    entityType: restrictionEntityTypeEnum("entity_type").notNull(),
    branchId: integer("branch_id").references(() => branchesTable.id, {
      onDelete: "cascade",
    }),
    sessionId: integer("session_id").references(() => academicSessionsTable.id, {
      onDelete: "cascade",
    }),
    classId: integer("class_id").references(() => classesTable.id, { onDelete: "cascade" }),
    sectionId: integer("section_id").references(() => sectionsTable.id, { onDelete: "cascade" }),
    studentId: integer("student_id").references(() => studentsTable.id, { onDelete: "cascade" }),
    allow: boolean("allow").notNull().default(true),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    assignmentIdx: index("role_branch_restrictions_assignment_idx").on(table.assignmentId),
    entityIdx: index("role_branch_restrictions_entity_idx").on(
      table.entityType,
      table.branchId,
      table.sessionId,
      table.classId,
      table.sectionId,
      table.studentId,
    ),
    assignmentTargetUq: uniqueIndex("role_branch_restrictions_assignment_target_uq").on(
      table.assignmentId,
      table.entityType,
      table.branchId,
      table.sessionId,
      table.classId,
      table.sectionId,
      table.studentId,
    ),
    hasTargetChk: check(
      "role_branch_restrictions_has_target_chk",
      sql`${table.branchId} IS NOT NULL OR ${table.sessionId} IS NOT NULL OR ${table.classId} IS NOT NULL OR ${table.sectionId} IS NOT NULL OR ${table.studentId} IS NOT NULL`,
    ),
    entityTargetConsistencyChk: check(
      "role_branch_restrictions_entity_target_consistency_chk",
      sql`(
        ${table.entityType} = 'branch' AND
        ${table.branchId} IS NOT NULL AND
        ${table.sessionId} IS NULL AND
        ${table.classId} IS NULL AND
        ${table.sectionId} IS NULL AND
        ${table.studentId} IS NULL
      ) OR (
        ${table.entityType} = 'session' AND
        ${table.branchId} IS NULL AND
        ${table.sessionId} IS NOT NULL AND
        ${table.classId} IS NULL AND
        ${table.sectionId} IS NULL AND
        ${table.studentId} IS NULL
      ) OR (
        ${table.entityType} = 'class' AND
        ${table.branchId} IS NULL AND
        ${table.sessionId} IS NULL AND
        ${table.classId} IS NOT NULL AND
        ${table.sectionId} IS NULL AND
        ${table.studentId} IS NULL
      ) OR (
        ${table.entityType} = 'section' AND
        ${table.branchId} IS NULL AND
        ${table.sessionId} IS NULL AND
        ${table.classId} IS NULL AND
        ${table.sectionId} IS NOT NULL AND
        ${table.studentId} IS NULL
      ) OR (
        ${table.entityType} = 'student' AND
        ${table.branchId} IS NULL AND
        ${table.sessionId} IS NULL AND
        ${table.classId} IS NULL AND
        ${table.sectionId} IS NULL AND
        ${table.studentId} IS NOT NULL
      )`,
    ),
  }),
);
