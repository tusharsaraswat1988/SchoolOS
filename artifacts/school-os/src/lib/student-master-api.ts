import { apiDelete, apiGet, apiSend, apiUpload } from "@/lib/api";

export type RelationType =
  | "father"
  | "mother"
  | "guardian"
  | "local_guardian"
  | "other";

export type PrimaryContactType = "father" | "mother" | "guardian" | "local_guardian";

export type Address = {
  addressLine1?: string | null;
  addressLine2?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pinCode?: string | null;
};

export type PersonRelation = {
  id: number;
  mappingId?: number;
  fullName: string;
  relationType: RelationType;
  mobile?: string | null;
  alternateMobile?: string | null;
  email?: string | null;
  aadhaar?: string | null;
  pan?: string | null;
  occupation?: string | null;
  photoUrl?: string | null;
  currentAddress: Address;
  permanentSameAsCurrent: boolean;
  permanentAddress: Address;
};

export type DocumentMaster = {
  id: number;
  schoolId: number;
  name: string;
  description?: string | null;
  applicableModules: string[];
  isMandatory: boolean;
  allowExpiryDate: boolean;
  allowDocumentNumber: boolean;
  allowedFileTypes: string[];
  isActive: boolean;
};

export type EntityDocument = {
  id: number;
  documentMasterId: number;
  documentTypeName?: string | null;
  documentNumber?: string | null;
  fileName?: string | null;
  previewUrl?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  remarks?: string | null;
  verificationStatus: "pending" | "verified" | "rejected";
  isExpired?: boolean;
  isMandatory?: boolean;
};

export type DocumentDashboardItem = {
  documentMasterId: number;
  name: string;
  description?: string | null;
  isMandatory: boolean;
  status: "uploaded" | "missing" | "expired" | "pending" | "rejected";
  document: EntityDocument | null;
};

export type DocumentDashboardResponse = {
  data: DocumentDashboardItem[];
  dashboard: DocumentDashboardItem[];
  summary: {
    totalRequired: number;
    uploadedRequired: number;
    completionPercent: number;
    missing: number;
    expired: number;
    pendingVerification: number;
    rejected: number;
  };
};

export type Sibling = {
  id: number;
  fullName: string;
  admissionNumber: string;
  registrationNumber?: string | null;
  classId: number;
  sectionId: number;
  status: string;
  age?: number | null;
};

function studentBase(branchId: number, sessionId: number, studentId: number) {
  return `/branches/${branchId}/sessions/${sessionId}/students/${studentId}`;
}

export async function fetchStudentRelations(
  branchId: number,
  sessionId: number,
  studentId: number,
) {
  return apiGet<{
    data: PersonRelation[];
    primaryCommunicationContact: { relationId: number; relationType: PrimaryContactType } | null;
  }>(`${studentBase(branchId, sessionId, studentId)}/relations`);
}

export async function createStudentRelation(
  branchId: number,
  sessionId: number,
  studentId: number,
  body: Partial<PersonRelation> & { fullName: string; relationType: RelationType },
) {
  return apiSend<PersonRelation>(
    `${studentBase(branchId, sessionId, studentId)}/relations`,
    "POST",
    body,
  );
}

export async function updateStudentRelation(
  branchId: number,
  sessionId: number,
  studentId: number,
  relationId: number,
  body: Partial<PersonRelation>,
) {
  return apiSend<PersonRelation>(
    `${studentBase(branchId, sessionId, studentId)}/relations/${relationId}`,
    "PATCH",
    body,
  );
}

export async function deleteStudentRelation(
  branchId: number,
  sessionId: number,
  studentId: number,
  relationId: number,
) {
  return apiDelete(`${studentBase(branchId, sessionId, studentId)}/relations/${relationId}`);
}

export async function setCommunicationPreference(
  branchId: number,
  sessionId: number,
  studentId: number,
  body: { primaryRelationId: number; primaryRelationType: PrimaryContactType },
) {
  return apiSend(
    `${studentBase(branchId, sessionId, studentId)}/communication-preference`,
    "PUT",
    body,
  );
}

export async function fetchSiblings(branchId: number, sessionId: number, studentId: number) {
  return apiGet<{ data: Sibling[] }>(`${studentBase(branchId, sessionId, studentId)}/siblings`);
}

export async function linkSibling(
  branchId: number,
  sessionId: number,
  studentId: number,
  siblingStudentId: number,
) {
  return apiSend(
    `${studentBase(branchId, sessionId, studentId)}/siblings`,
    "POST",
    { siblingStudentId },
  );
}

export async function unlinkSibling(
  branchId: number,
  sessionId: number,
  studentId: number,
  siblingId: number,
) {
  return apiDelete(`${studentBase(branchId, sessionId, studentId)}/siblings/${siblingId}`);
}

export async function fetchDocumentMaster(schoolId: number, module?: string) {
  const q = module ? `?module=${module}` : "";
  return apiGet<{ data: DocumentMaster[]; total: number }>(
    `/schools/${schoolId}/document-master${q}`,
  );
}

export async function createDocumentMaster(
  schoolId: number,
  body: Omit<DocumentMaster, "id" | "schoolId" | "isActive">,
) {
  return apiSend<DocumentMaster>(`/schools/${schoolId}/document-master`, "POST", body);
}

export async function updateDocumentMaster(
  schoolId: number,
  masterId: number,
  body: Partial<DocumentMaster>,
) {
  return apiSend<DocumentMaster>(
    `/schools/${schoolId}/document-master/${masterId}`,
    "PATCH",
    body,
  );
}

export async function fetchEntityDocuments(
  branchId: number,
  sessionId: number,
  studentId: number,
  filter?: string,
) {
  const q = filter ? `?filter=${filter}` : "";
  return apiGet<DocumentDashboardResponse>(
    `${studentBase(branchId, sessionId, studentId)}/entity-documents${q}`,
  );
}

export async function uploadEntityDocument(
  branchId: number,
  sessionId: number,
  studentId: number,
  formData: FormData,
) {
  return apiUpload<EntityDocument>(
    `${studentBase(branchId, sessionId, studentId)}/entity-documents`,
    formData,
  );
}

export async function updateEntityDocument(
  branchId: number,
  sessionId: number,
  studentId: number,
  documentId: number,
  body: {
    documentNumber?: string | null;
    issueDate?: string | null;
    expiryDate?: string | null;
    remarks?: string | null;
    verificationStatus?: "pending" | "verified" | "rejected";
    rejectionReason?: string | null;
  },
) {
  return apiSend<EntityDocument>(
    `${studentBase(branchId, sessionId, studentId)}/entity-documents/${documentId}`,
    "PATCH",
    body,
  );
}

export function calculateAgeFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

export const STUDENT_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "left", label: "Left" },
  { value: "tc_issued", label: "TC Issued" },
  { value: "alumni", label: "Alumni" },
  { value: "suspended", label: "Suspended" },
  { value: "inactive", label: "Inactive (Legacy)" },
  { value: "transferred", label: "Transferred (Legacy)" },
  { value: "graduated", label: "Graduated (Legacy)" },
] as const;

export const RELATION_TYPE_OPTIONS = [
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "guardian", label: "Guardian" },
  { value: "local_guardian", label: "Local Guardian" },
  { value: "other", label: "Other" },
] as const;

export const PRIMARY_CONTACT_OPTIONS = [
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "guardian", label: "Guardian" },
  { value: "local_guardian", label: "Local Guardian" },
] as const;
