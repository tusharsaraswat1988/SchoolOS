export type CloudinaryCredentials = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

export type UploadSource = string | Buffer;

export type UploadResult = {
  publicId: string;
  secureUrl: string;
  width?: number;
  height?: number;
  format: string;
  bytes: number;
  resourceType: "image" | "video" | "raw" | "auto";
};

export type SecureUrlOptions = {
  width?: number;
  height?: number;
  crop?: "fill" | "fit" | "scale" | "thumb" | "limit";
  quality?: "auto" | number;
  format?: "auto" | "webp" | "jpg" | "png";
  expiresAt?: Date;
};

export type StudentPhotoContext = {
  societyId: number;
  schoolId: number;
  branchId: number;
  sessionId: number;
  studentId: number;
};

export type StudentDocumentContext = StudentPhotoContext & {
  documentType: string;
  filename?: string;
};

export type StaffPhotoContext = {
  societyId: number;
  schoolId: number;
  branchId: number;
  userId: number;
};

export type SchoolLogoContext = {
  societyId: number;
  schoolId: number;
};

export type BranchLogoContext = {
  societyId: number;
  schoolId: number;
  branchId: number;
};

export type AnnouncementAttachmentContext = {
  societyId: number;
  schoolId: number;
  branchId: number;
  announcementId: number;
};
