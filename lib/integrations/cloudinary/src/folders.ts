import type {
  AnnouncementAttachmentContext,
  BranchLogoContext,
  SchoolLogoContext,
  StaffPhotoContext,
  StudentDocumentContext,
  StudentPhotoContext,
} from "./types.js";

const ROOT = "schoolos";

export const uploadFolders = {
  students: `${ROOT}/students`,
  staff: `${ROOT}/staff`,
  schoolLogos: `${ROOT}/schools/logos`,
  branchLogos: `${ROOT}/branches/logos`,
  announcementAttachments: `${ROOT}/announcements/attachments`,
  studentDocuments: `${ROOT}/students`,
} as const;

export function studentPhotoFolder(context: StudentPhotoContext): string {
  return [
    uploadFolders.students,
    context.societyId,
    context.schoolId,
    context.branchId,
    context.sessionId,
    context.studentId,
  ].join("/");
}

export function studentDocumentFolder(context: StudentDocumentContext): string {
  return [
    uploadFolders.studentDocuments,
    context.societyId,
    context.schoolId,
    context.branchId,
    context.sessionId,
    context.studentId,
    "documents",
  ].join("/");
}

export function staffPhotoFolder(context: StaffPhotoContext): string {
  return [
    uploadFolders.staff,
    context.societyId,
    context.schoolId,
    context.branchId,
    context.userId,
  ].join("/");
}

export function schoolLogoFolder(context: SchoolLogoContext): string {
  return [uploadFolders.schoolLogos, context.societyId, context.schoolId].join("/");
}

export function branchLogoFolder(context: BranchLogoContext): string {
  return [
    uploadFolders.branchLogos,
    context.societyId,
    context.schoolId,
    context.branchId,
  ].join("/");
}

export function announcementAttachmentFolder(
  context: AnnouncementAttachmentContext,
): string {
  return [
    uploadFolders.announcementAttachments,
    context.societyId,
    context.schoolId,
    context.branchId,
    context.announcementId,
  ].join("/");
}
