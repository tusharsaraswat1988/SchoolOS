import { relations } from "drizzle-orm";
import { academicSessionsTable } from "./academic-sessions";
import { announcementsTable } from "./announcements";
import { attendanceRecordsTable } from "./attendance";
import { auditLogsTable } from "./audit";
import { branchesTable } from "./branches";
import { classesTable } from "./classes";
import { feeRecordsTable } from "./fees";
import { platformsTable } from "./platforms";
import {
  permissionsTable,
  rolePermissionsTable,
  rolesTable,
} from "./roles";
import {
  roleBranchRestrictionsTable,
  userRoleAssignmentsTable,
} from "./rbac-assignments";
import { schoolsTable } from "./schools";
import { sectionsTable } from "./sections";
import { societiesTable } from "./societies";
import { parentsTable, studentsTable } from "./students";
import { otpLoginEventsTable, userPermissionsTable, usersTable } from "./users";

export const platformsRelations = relations(platformsTable, ({ many }) => ({
  societies: many(societiesTable),
}));

export const societiesRelations = relations(societiesTable, ({ one, many }) => ({
  platform: one(platformsTable, {
    fields: [societiesTable.platformId],
    references: [platformsTable.id],
  }),
  schools: many(schoolsTable),
  branches: many(branchesTable),
}));

export const schoolsRelations = relations(schoolsTable, ({ one, many }) => ({
  society: one(societiesTable, {
    fields: [schoolsTable.societyId],
    references: [societiesTable.id],
  }),
  branches: many(branchesTable),
}));

export const branchesRelations = relations(branchesTable, ({ one, many }) => ({
  society: one(societiesTable, {
    fields: [branchesTable.societyId],
    references: [societiesTable.id],
  }),
  school: one(schoolsTable, {
    fields: [branchesTable.schoolId],
    references: [schoolsTable.id],
  }),
  sessions: many(academicSessionsTable),
}));

export const sessionsRelations = relations(academicSessionsTable, ({ one, many }) => ({
  branch: one(branchesTable, {
    fields: [academicSessionsTable.branchId],
    references: [branchesTable.id],
  }),
  classes: many(classesTable),
}));

export const rolesRelations = relations(rolesTable, ({ many }) => ({
  users: many(usersTable),
  rolePermissions: many(rolePermissionsTable),
  assignments: many(userRoleAssignmentsTable),
}));

export const permissionsRelations = relations(permissionsTable, ({ many }) => ({
  rolePermissions: many(rolePermissionsTable),
  userPermissions: many(userPermissionsTable),
}));

export const rolePermissionsRelations = relations(rolePermissionsTable, ({ one }) => ({
  role: one(rolesTable, {
    fields: [rolePermissionsTable.roleId],
    references: [rolesTable.id],
  }),
  permission: one(permissionsTable, {
    fields: [rolePermissionsTable.permissionId],
    references: [permissionsTable.id],
  }),
}));

export const usersRelations = relations(usersTable, ({ one, many }) => ({
  role: one(rolesTable, {
    fields: [usersTable.roleId],
    references: [rolesTable.id],
  }),
  society: one(societiesTable, {
    fields: [usersTable.societyId],
    references: [societiesTable.id],
  }),
  school: one(schoolsTable, {
    fields: [usersTable.schoolId],
    references: [schoolsTable.id],
  }),
  branch: one(branchesTable, {
    fields: [usersTable.branchId],
    references: [branchesTable.id],
  }),
  userPermissions: many(userPermissionsTable),
  roleAssignments: many(userRoleAssignmentsTable),
  otpEvents: many(otpLoginEventsTable),
}));

export const userRoleAssignmentsRelations = relations(userRoleAssignmentsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [userRoleAssignmentsTable.userId],
    references: [usersTable.id],
  }),
  role: one(rolesTable, {
    fields: [userRoleAssignmentsTable.roleId],
    references: [rolesTable.id],
  }),
  society: one(societiesTable, {
    fields: [userRoleAssignmentsTable.societyId],
    references: [societiesTable.id],
  }),
  school: one(schoolsTable, {
    fields: [userRoleAssignmentsTable.schoolId],
    references: [schoolsTable.id],
  }),
  branch: one(branchesTable, {
    fields: [userRoleAssignmentsTable.branchId],
    references: [branchesTable.id],
  }),
  restrictions: many(roleBranchRestrictionsTable),
}));

export const roleBranchRestrictionsRelations = relations(roleBranchRestrictionsTable, ({ one }) => ({
  assignment: one(userRoleAssignmentsTable, {
    fields: [roleBranchRestrictionsTable.assignmentId],
    references: [userRoleAssignmentsTable.id],
  }),
  branch: one(branchesTable, {
    fields: [roleBranchRestrictionsTable.branchId],
    references: [branchesTable.id],
  }),
  session: one(academicSessionsTable, {
    fields: [roleBranchRestrictionsTable.sessionId],
    references: [academicSessionsTable.id],
  }),
  class: one(classesTable, {
    fields: [roleBranchRestrictionsTable.classId],
    references: [classesTable.id],
  }),
  section: one(sectionsTable, {
    fields: [roleBranchRestrictionsTable.sectionId],
    references: [sectionsTable.id],
  }),
  student: one(studentsTable, {
    fields: [roleBranchRestrictionsTable.studentId],
    references: [studentsTable.id],
  }),
}));

export const classesRelations = relations(classesTable, ({ one, many }) => ({
  session: one(academicSessionsTable, {
    fields: [classesTable.sessionId],
    references: [academicSessionsTable.id],
  }),
  sections: many(sectionsTable),
}));

export const sectionsRelations = relations(sectionsTable, ({ one, many }) => ({
  class: one(classesTable, {
    fields: [sectionsTable.classId],
    references: [classesTable.id],
  }),
  students: many(studentsTable),
}));

export const studentsRelations = relations(studentsTable, ({ one, many }) => ({
  class: one(classesTable, {
    fields: [studentsTable.classId],
    references: [classesTable.id],
  }),
  section: one(sectionsTable, {
    fields: [studentsTable.sectionId],
    references: [sectionsTable.id],
  }),
  parents: many(parentsTable),
}));

export const parentsRelations = relations(parentsTable, ({ one }) => ({
  student: one(studentsTable, {
    fields: [parentsTable.studentId],
    references: [studentsTable.id],
  }),
  user: one(usersTable, {
    fields: [parentsTable.userId],
    references: [usersTable.id],
  }),
}));
