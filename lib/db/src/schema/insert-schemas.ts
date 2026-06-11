import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { academicSessionsTable } from "./academic-sessions";
import { announcementsTable } from "./announcements";
import { attendanceRecordsTable } from "./attendance";
import { auditLogsTable } from "./audit";
import { branchesTable } from "./branches";
import { classesTable } from "./classes";
import { feeRecordsTable } from "./fees";
import { permissionsTable, rolesTable } from "./roles";
import { schoolsTable } from "./schools";
import { sectionsTable } from "./sections";
import { societiesTable } from "./societies";
import { parentsTable, studentsTable } from "./students";
import { usersTable } from "./users";

export const insertSocietySchema = createInsertSchema(societiesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertSchoolSchema = createInsertSchema(schoolsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertBranchSchema = createInsertSchema(branchesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertAcademicSessionSchema = createInsertSchema(academicSessionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertRoleSchema = createInsertSchema(rolesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertPermissionSchema = createInsertSchema(permissionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertClassSchema = createInsertSchema(classesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertSectionSchema = createInsertSchema(sectionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertStudentSchema = createInsertSchema(studentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertParentSchema = createInsertSchema(parentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertAuditLogSchema = createInsertSchema(auditLogsTable).omit({
  id: true,
  createdAt: true,
});
export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecordsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertFeeRecordSchema = createInsertSchema(feeRecordsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertAnnouncementSchema = createInsertSchema(announcementsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSociety = z.infer<typeof insertSocietySchema>;
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type InsertAcademicSession = z.infer<typeof insertAcademicSessionSchema>;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type InsertSection = z.infer<typeof insertSectionSchema>;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type InsertParent = z.infer<typeof insertParentSchema>;
