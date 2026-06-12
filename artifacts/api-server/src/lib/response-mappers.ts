import { calculateAge } from "./student-scope";

export function mapStudentResponse<T extends {
  dob?: string | null;
  parentMobile?: string;
  sectionName?: string | null;
  sectionId?: number;
  socialCategory?: string | null;
  registrationNumber?: string | null;
  nationality?: string | null;
  penNumber?: string | null;
  apaarId?: string | null;
  udiseStudentId?: string | null;
  isRteStudent?: boolean;
  isCwsnStudent?: boolean;
  house?: string | null;
  signatureUrl?: string | null;
}>(row: T) {
  return {
    ...row,
    dateOfBirth: row.dob,
    age: calculateAge(row.dob),
    parentPhone: row.parentMobile,
    section: row.sectionName ?? undefined,
    category: row.socialCategory ?? undefined,
    studentName: "firstName" in row && "lastName" in row
      ? `${(row as { firstName: string }).firstName} ${(row as { lastName: string }).lastName}`.trim()
      : undefined,
  };
}

export function mapClassResponse<T extends {
  gradeOrder?: number | null;
  classTeacherUserId?: number | null;
  sectionCount?: number;
  studentCount?: number;
}>(row: T & { name: string }) {
  return {
    ...row,
    grade: row.gradeOrder,
    classTeacherId: row.classTeacherUserId,
    capacity: row.sectionCount ? row.sectionCount * 50 : 50,
    section: undefined as string | undefined,
  };
}

export function mapAnnouncementResponse<T extends { body: string }>(row: T) {
  return {
    ...row,
    content: row.body,
  };
}

export function mapBranchUserResponse(row: {
  name: string;
  mobile?: string;
  roleKey?: string | null;
  roleName?: string | null;
  metadata?: Record<string, unknown> | null;
  [key: string]: unknown;
}) {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  return {
    ...row,
    role: row.roleKey,
    firstName: String(meta.firstName ?? row.name?.split(" ")[0] ?? ""),
    lastName: String(meta.lastName ?? row.name?.split(" ").slice(1).join(" ") ?? ""),
    email: (meta.email as string | undefined) ?? null,
    phone: row.mobile ?? (meta.phone as string | undefined) ?? null,
    subject: meta.subject as string | undefined,
    salary: meta.salary as number | undefined,
    joinDate: meta.joinDate as string | undefined,
  };
}

export function mapAuditEventResponse(row: {
  id?: number;
  action: string;
  entityType: string;
  entityLabel?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
}) {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    type: row.action,
    description: row.entityLabel ?? `${row.action} on ${row.entityType}`,
    actorName: (meta.actorName as string | undefined) ?? null,
    targetName: row.entityLabel ?? (meta.targetName as string | undefined) ?? null,
    amount: (meta.amount as number | undefined) ?? null,
    createdAt: row.createdAt,
  };
}
