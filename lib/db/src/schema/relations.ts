import { relations } from "drizzle-orm";
import { academicSessionsTable } from "./academic-sessions";
import { financialSessionsTable } from "./financial-sessions";
import { announcementsTable } from "./announcements";
import { attendanceRecordsTable } from "./attendance";
import { auditLogsTable } from "./audit";
import { branchesTable } from "./branches";
import { classesTable } from "./classes";
import {
  billingRunsTable,
  numberSequencesTable,
  studentFeeAssignmentsTable,
} from "./billing-config";
import {
  billingSettingsTable,
  invoiceItemsTable,
  invoicesTable,
  invoiceTemplatesTable,
} from "./billing-invoices";
import { ledgerEntriesTable } from "./billing-ledger";
import { feeHeadsTable } from "./fee-structures";
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
import {
  admissionLeadFollowUpsTable,
  admissionLeadsTable,
} from "./admission-leads";
import {
  communicationPreferencesTable,
  documentMasterTable,
  documentVerificationsTable,
  documentsTable,
  personRelationsTable,
  siblingMappingsTable,
  studentRelationMappingsTable,
} from "./student-master";
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
  financialSessions: many(financialSessionsTable),
}));

export const sessionsRelations = relations(academicSessionsTable, ({ one, many }) => ({
  branch: one(branchesTable, {
    fields: [academicSessionsTable.branchId],
    references: [branchesTable.id],
  }),
  classes: many(classesTable),
  admissionLeads: many(admissionLeadsTable),
}));

export const financialSessionsRelations = relations(financialSessionsTable, ({ one }) => ({
  branch: one(branchesTable, {
    fields: [financialSessionsTable.branchId],
    references: [branchesTable.id],
  }),
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
  billingClass: one(classesTable, {
    fields: [studentsTable.billingClassId],
    references: [classesTable.id],
    relationName: "studentBillingClass",
  }),
  section: one(sectionsTable, {
    fields: [studentsTable.sectionId],
    references: [sectionsTable.id],
  }),
  parents: many(parentsTable),
  relationMappings: many(studentRelationMappingsTable),
  communicationPreference: one(communicationPreferencesTable, {
    fields: [studentsTable.id],
    references: [communicationPreferencesTable.studentId],
  }),
  feeAssignments: many(studentFeeAssignmentsTable),
  ledgerEntries: many(ledgerEntriesTable),
}));

export const personRelationsRelations = relations(personRelationsTable, ({ many }) => ({
  studentMappings: many(studentRelationMappingsTable),
}));

export const studentRelationMappingsRelations = relations(
  studentRelationMappingsTable,
  ({ one }) => ({
    student: one(studentsTable, {
      fields: [studentRelationMappingsTable.studentId],
      references: [studentsTable.id],
    }),
    relation: one(personRelationsTable, {
      fields: [studentRelationMappingsTable.relationId],
      references: [personRelationsTable.id],
    }),
  }),
);

export const siblingMappingsRelations = relations(siblingMappingsTable, ({ one }) => ({
  studentA: one(studentsTable, {
    fields: [siblingMappingsTable.studentIdA],
    references: [studentsTable.id],
    relationName: "siblingAsA",
  }),
  studentB: one(studentsTable, {
    fields: [siblingMappingsTable.studentIdB],
    references: [studentsTable.id],
    relationName: "siblingAsB",
  }),
}));

export const documentMasterRelations = relations(documentMasterTable, ({ many }) => ({
  documents: many(documentsTable),
}));

export const documentsRelations = relations(documentsTable, ({ one, many }) => ({
  documentMaster: one(documentMasterTable, {
    fields: [documentsTable.documentMasterId],
    references: [documentMasterTable.id],
  }),
  verifications: many(documentVerificationsTable),
}));

export const documentVerificationsRelations = relations(
  documentVerificationsTable,
  ({ one }) => ({
    document: one(documentsTable, {
      fields: [documentVerificationsTable.documentId],
      references: [documentsTable.id],
    }),
  }),
);

export const communicationPreferencesRelations = relations(
  communicationPreferencesTable,
  ({ one }) => ({
    student: one(studentsTable, {
      fields: [communicationPreferencesTable.studentId],
      references: [studentsTable.id],
    }),
    primaryRelation: one(personRelationsTable, {
      fields: [communicationPreferencesTable.primaryRelationId],
      references: [personRelationsTable.id],
    }),
  }),
);

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

export const admissionLeadsRelations = relations(admissionLeadsTable, ({ one, many }) => ({
  session: one(academicSessionsTable, {
    fields: [admissionLeadsTable.sessionId],
    references: [academicSessionsTable.id],
  }),
  interestedClass: one(classesTable, {
    fields: [admissionLeadsTable.interestedClassId],
    references: [classesTable.id],
  }),
  convertedStudent: one(studentsTable, {
    fields: [admissionLeadsTable.convertedStudentId],
    references: [studentsTable.id],
  }),
  assignedTo: one(usersTable, {
    fields: [admissionLeadsTable.assignedToUserId],
    references: [usersTable.id],
  }),
  followUps: many(admissionLeadFollowUpsTable),
}));

export const admissionLeadFollowUpsRelations = relations(admissionLeadFollowUpsTable, ({ one }) => ({
  lead: one(admissionLeadsTable, {
    fields: [admissionLeadFollowUpsTable.leadId],
    references: [admissionLeadsTable.id],
  }),
}));

export const numberSequencesRelations = relations(numberSequencesTable, ({ one }) => ({
  branch: one(branchesTable, {
    fields: [numberSequencesTable.branchId],
    references: [branchesTable.id],
  }),
  session: one(academicSessionsTable, {
    fields: [numberSequencesTable.sessionId],
    references: [academicSessionsTable.id],
  }),
}));

export const billingRunsRelations = relations(billingRunsTable, ({ one }) => ({
  branch: one(branchesTable, {
    fields: [billingRunsTable.branchId],
    references: [branchesTable.id],
  }),
  session: one(academicSessionsTable, {
    fields: [billingRunsTable.sessionId],
    references: [academicSessionsTable.id],
  }),
  createdByUser: one(usersTable, {
    fields: [billingRunsTable.createdBy],
    references: [usersTable.id],
  }),
}));

export const studentFeeAssignmentsRelations = relations(studentFeeAssignmentsTable, ({ one }) => ({
  student: one(studentsTable, {
    fields: [studentFeeAssignmentsTable.studentId],
    references: [studentsTable.id],
  }),
  feeHead: one(feeHeadsTable, {
    fields: [studentFeeAssignmentsTable.feeHeadId],
    references: [feeHeadsTable.id],
  }),
  session: one(academicSessionsTable, {
    fields: [studentFeeAssignmentsTable.sessionId],
    references: [academicSessionsTable.id],
  }),
}));

export const ledgerEntriesRelations = relations(ledgerEntriesTable, ({ one }) => ({
  student: one(studentsTable, {
    fields: [ledgerEntriesTable.studentId],
    references: [studentsTable.id],
  }),
  feeHead: one(feeHeadsTable, {
    fields: [ledgerEntriesTable.feeHeadId],
    references: [feeHeadsTable.id],
  }),
  referenceEntry: one(ledgerEntriesTable, {
    fields: [ledgerEntriesTable.referenceEntryId],
    references: [ledgerEntriesTable.id],
    relationName: "ledgerEntryReference",
  }),
  createdByUser: one(usersTable, {
    fields: [ledgerEntriesTable.createdBy],
    references: [usersTable.id],
  }),
  invoice: one(invoicesTable, {
    fields: [ledgerEntriesTable.invoiceId],
    references: [invoicesTable.id],
  }),
  invoiceItem: one(invoiceItemsTable, {
    fields: [ledgerEntriesTable.invoiceItemId],
    references: [invoiceItemsTable.id],
  }),
}));

export const invoiceTemplatesRelations = relations(invoiceTemplatesTable, ({ one, many }) => ({
  branch: one(branchesTable, {
    fields: [invoiceTemplatesTable.branchId],
    references: [branchesTable.id],
  }),
  session: one(academicSessionsTable, {
    fields: [invoiceTemplatesTable.sessionId],
    references: [academicSessionsTable.id],
  }),
  invoices: many(invoicesTable),
  billingSettings: many(billingSettingsTable),
}));

export const billingSettingsRelations = relations(billingSettingsTable, ({ one }) => ({
  branch: one(branchesTable, {
    fields: [billingSettingsTable.branchId],
    references: [branchesTable.id],
  }),
  session: one(academicSessionsTable, {
    fields: [billingSettingsTable.sessionId],
    references: [academicSessionsTable.id],
  }),
  invoiceTemplate: one(invoiceTemplatesTable, {
    fields: [billingSettingsTable.invoiceTemplateId],
    references: [invoiceTemplatesTable.id],
  }),
}));

export const invoicesRelations = relations(invoicesTable, ({ one, many }) => ({
  student: one(studentsTable, {
    fields: [invoicesTable.studentId],
    references: [studentsTable.id],
  }),
  session: one(academicSessionsTable, {
    fields: [invoicesTable.sessionId],
    references: [academicSessionsTable.id],
  }),
  billingRun: one(billingRunsTable, {
    fields: [invoicesTable.billingRunId],
    references: [billingRunsTable.id],
  }),
  invoiceTemplate: one(invoiceTemplatesTable, {
    fields: [invoicesTable.invoiceTemplateId],
    references: [invoiceTemplatesTable.id],
  }),
  items: many(invoiceItemsTable),
}));

export const invoiceItemsRelations = relations(invoiceItemsTable, ({ one }) => ({
  invoice: one(invoicesTable, {
    fields: [invoiceItemsTable.invoiceId],
    references: [invoicesTable.id],
  }),
  feeHead: one(feeHeadsTable, {
    fields: [invoiceItemsTable.feeHeadId],
    references: [feeHeadsTable.id],
  }),
}));
