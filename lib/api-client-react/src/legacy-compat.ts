// @ts-nocheck — legacy adapters map branch/session scoped Phase-0 API hooks.
import { useMutation } from "@tanstack/react-query";
import type {
  UseMutationOptions,
  UseQueryOptions,
  QueryKey,
} from "@tanstack/react-query";

import {
  createAnnouncement as createAnnouncementApi,
  createBranchUser as createBranchUserApi,
  createClass as createClassApi,
  createStudent as createStudentApi,
  deleteAnnouncement as deleteAnnouncementApi,
  deleteStudent as deleteStudentApi,
  getAttendanceSummary as getAttendanceSummaryApi,
  getBranchDashboard as getBranchDashboardApi,
  getCreateAnnouncementMutationOptions,
  getCreateBranchUserMutationOptions,
  getCreateClassMutationOptions,
  getCreateStudentMutationOptions,
  getDeleteAnnouncementMutationOptions,
  getDeleteStudentMutationOptions,
  getFeeSummary as getFeeSummaryApi,
  getUpdateStudentMutationOptions,
  getGetAttendanceSummaryQueryKey as getGetAttendanceSummaryQueryKeyPhase0,
  getGetBranchDashboardQueryKey as getGetBranchDashboardQueryKeyPhase0,
  getGetFeeSummaryQueryKey as getGetFeeSummaryQueryKeyPhase0,
  getGetStudentQueryKey as getGetStudentQueryKeyPhase0,
  getListAnnouncementsQueryKey as getListAnnouncementsQueryKeyPhase0,
  getListAttendanceQueryKey as getListAttendanceQueryKeyPhase0,
  getListAuditEventsQueryKey as getListAuditEventsQueryKeyPhase0,
  getListBranchUsersQueryKey as getListBranchUsersQueryKeyPhase0,
  getListClassesQueryKey as getListClassesQueryKeyPhase0,
  getListFeeRecordsQueryKey as getListFeeRecordsQueryKeyPhase0,
  getListStudentsQueryKey as getListStudentsQueryKeyPhase0,
  getMarkAttendanceMutationOptions,
  getRecordFeePaymentMutationOptions,
  getStudent as getStudentApi,
  listAnnouncements as listAnnouncementsApi,
  listAttendance as listAttendanceApi,
  listAuditEvents as listAuditEventsApi,
  listBranchUsers as listBranchUsersApi,
  listClasses as listClassesApi,
  listFeeRecords as listFeeRecordsApi,
  listStudents as listStudentsApi,
  markAttendance as markAttendanceApi,
  recordFeePayment as recordFeePaymentApi,
  updateStudent as updateStudentApi,
  useGetBranchDashboard as useGetBranchDashboardPhase0,
  useGetStudent as useGetStudentPhase0,
  useGetAttendanceSummary as useGetAttendanceSummaryPhase0,
  useGetFeeSummary as useGetFeeSummaryPhase0,
  useListAnnouncements as useListAnnouncementsPhase0,
  useListAttendance as useListAttendancePhase0,
  useListAuditEvents as useListAuditEventsPhase0,
  useListBranchUsers as useListBranchUsersPhase0,
  useListClasses as useListClassesPhase0,
  useListFeeRecords as useListFeeRecordsPhase0,
  useListStudents as useListStudentsPhase0,
} from "./generated/api";

import type {
  CreateAnnouncementBody,
  CreateBranchUserBody,
  CreateClassBody,
  CreateStudentBody,
  ListAnnouncementsParams,
  ListAttendanceParams,
  ListBranchUsersParams,
  ListFeeRecordsParams,
  ListStudentsParams,
  MarkAttendanceBody,
  RecordFeePaymentBody,
  StaffMember,
  UpdateStudentBody,
} from "./generated/api.schemas";

function branchSessionEnabled(
  branchId?: number | null,
  sessionId?: number | null,
  enabled?: boolean,
) {
  return !!branchId && !!sessionId && (enabled ?? true);
}

function branchOnlyEnabled(branchId?: number | null, enabled?: boolean) {
  return !!branchId && (enabled ?? true);
}

type QueryOpts<TData, TError> = {
  query?: UseQueryOptions<TData, TError, TData>;
};

export type CreateStaffBody = {
  firstName: string;
  lastName: string;
  role?: string;
  email: string;
  phone: string;
  subject?: string;
  salary?: number;
  joinDate?: string;
  employeeId?: string;
  gender?: "male" | "female" | "other";
  dob?: string;
  joiningDate?: string;
  designation?: string;
  staffType?: "teaching" | "non_teaching";
  qualification?: string;
  professionalQualification?: string;
  appointmentType?: "regular" | "contract" | "guest";
  salaryReference?: string;
};

const ROLE_KEY_MAP: Record<string, string> = {
  teacher: "teacher",
  principal: "principal",
  accountant: "accountant",
  admin: "school_admin",
  support: "teacher",
};

export function getListStudentsQueryKey(
  branchId: number,
  sessionId: number,
  params?: ListStudentsParams,
): QueryKey {
  return getListStudentsQueryKeyPhase0(branchId, sessionId, params);
}

export function useListStudents<
  TData = Awaited<ReturnType<typeof listStudentsApi>>,
  TError = unknown,
>(
  branchId: number | null | undefined,
  sessionId: number | null | undefined,
  params?: ListStudentsParams,
  options?: QueryOpts<Awaited<ReturnType<typeof listStudentsApi>>, TError>,
) {
  return useListStudentsPhase0(branchId ?? 0, sessionId ?? 0, params, {
    ...options,
    query: {
      ...options?.query,
      enabled: branchSessionEnabled(branchId, sessionId, options?.query?.enabled),
    },
  });
}

export function useGetStudent<
  TData = Awaited<ReturnType<typeof getStudentApi>>,
  TError = unknown,
>(
  branchId: number | null | undefined,
  sessionId: number | null | undefined,
  studentId: number,
  options?: QueryOpts<TData, TError>,
) {
  return useGetStudentPhase0(branchId ?? 0, sessionId ?? 0, studentId, {
    ...options,
    query: {
      ...options?.query,
      enabled: branchSessionEnabled(branchId, sessionId, options?.query?.enabled),
    },
  });
}

export function getGetStudentQueryKey(
  branchId: number,
  sessionId: number,
  studentId: number,
): QueryKey {
  return getGetStudentQueryKeyPhase0(branchId, sessionId, studentId);
}

export const useCreateStudent = <TError = unknown, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof createStudentApi>>,
    TError,
    { branchId: number; sessionId: number; data: CreateStudentBody },
    TContext
  >;
}) => {
  const base = getCreateStudentMutationOptions(options as never);
  return useMutation({
    ...base,
    mutationFn: (vars: { branchId: number; sessionId: number; data: CreateStudentBody }) =>
      createStudentApi(vars.branchId, vars.sessionId, {
        ...vars.data,
        sectionId: vars.data.sectionId ?? 1,
      }),
  });
};

export const useUpdateStudent = <TError = unknown, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof updateStudentApi>>,
    TError,
    {
      branchId: number;
      sessionId: number;
      studentId: number;
      data: UpdateStudentBody;
    },
    TContext
  >;
}) => {
  const base = getUpdateStudentMutationOptions(options as never);
  return useMutation({
    ...base,
    mutationFn: (vars: {
      branchId: number;
      sessionId: number;
      studentId: number;
      data: UpdateStudentBody;
    }) => updateStudentApi(vars.branchId, vars.sessionId, vars.studentId, vars.data),
  });
};

export const useDeleteStudent = <TError = unknown, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<
    unknown,
    TError,
    { branchId: number; sessionId: number; studentId: number },
    TContext
  >;
}) => {
  const base = getDeleteStudentMutationOptions(options as never);
  return useMutation({
    ...base,
    mutationFn: (vars: { branchId: number; sessionId: number; studentId: number }) =>
      deleteStudentApi(vars.branchId, vars.sessionId, vars.studentId),
  });
};

export function getListClassesQueryKey(branchId: number, sessionId: number): QueryKey {
  return getListClassesQueryKeyPhase0(branchId, sessionId);
}

export function useListClasses<
  TData = Awaited<ReturnType<typeof listClassesApi>>,
  TError = unknown,
>(
  branchId: number | null | undefined,
  sessionId: number | null | undefined,
  options?: QueryOpts<TData, TError>,
) {
  return useListClassesPhase0(branchId ?? 0, sessionId ?? 0, {
    ...options,
    query: {
      ...options?.query,
      enabled: branchSessionEnabled(branchId, sessionId, options?.query?.enabled),
    },
  });
}

export const useCreateClass = <TError = unknown, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<
    unknown,
    TError,
    { branchId: number; sessionId: number; data: CreateClassBody },
    TContext
  >;
}) => {
  const base = getCreateClassMutationOptions(options as never);
  return useMutation({
    ...base,
    mutationFn: (vars: { branchId: number; sessionId: number; data: CreateClassBody }) =>
      createClassApi(vars.branchId, vars.sessionId, vars.data),
  });
};

export function getListStaffQueryKey(branchId: number, params?: ListBranchUsersParams): QueryKey {
  return getListBranchUsersQueryKeyPhase0(branchId, params);
}

export function useListStaff<
  TData = Awaited<ReturnType<typeof listBranchUsersApi>>,
  TError = unknown,
>(
  branchId: number | null | undefined,
  params?: ListBranchUsersParams,
  options?: QueryOpts<TData, TError>,
) {
  return useListBranchUsersPhase0(branchId ?? 0, params, {
    ...options,
    query: {
      ...options?.query,
      enabled: branchOnlyEnabled(branchId, options?.query?.enabled),
    },
  });
}

export const useCreateStaff = <TError = unknown, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<
    StaffMember,
    TError,
    { branchId: number; data: CreateStaffBody },
    TContext
  >;
}) => {
  const base = getCreateBranchUserMutationOptions(options as never);
  return useMutation({
    ...base,
    mutationFn: (vars: { branchId: number; data: CreateStaffBody }) => {
      const d = vars.data;
      if (!d.phone?.trim()) throw new Error("Staff mobile is required");
      if (!d.email?.trim()) throw new Error("Staff email is required");
      const body = {
        name: `${d.firstName} ${d.lastName}`.trim(),
        mobile: d.phone,
        roleKey: ROLE_KEY_MAP[d.role ?? "teacher"] ?? "teacher",
        email: d.email,
        metadata: {
          firstName: d.firstName,
          lastName: d.lastName,
          subject: d.subject,
          salary: d.salary,
          joinDate: d.joinDate,
        },
        employeeId: d.employeeId,
        gender: d.gender,
        dob: d.dob,
        joiningDate: d.joiningDate ?? d.joinDate,
        designation: d.designation,
        staffType: d.staffType,
        qualification: d.qualification,
        professionalQualification: d.professionalQualification,
        appointmentType: d.appointmentType,
        salaryReference: d.salaryReference,
        subjectsTaught: d.subject ? [d.subject] : undefined,
      };
      return createBranchUserApi(vars.branchId, body as CreateBranchUserBody);
    },
  });
};

export function getListAttendanceQueryKey(
  branchId: number,
  sessionId: number,
  params?: ListAttendanceParams,
): QueryKey {
  return getListAttendanceQueryKeyPhase0(branchId, sessionId, params);
}

export function useListAttendance<
  TData = Awaited<ReturnType<typeof listAttendanceApi>>,
  TError = unknown,
>(
  branchId: number | null | undefined,
  sessionId: number | null | undefined,
  params?: ListAttendanceParams,
  options?: QueryOpts<TData, TError>,
) {
  return useListAttendancePhase0(branchId ?? 0, sessionId ?? 0, params, {
    ...options,
    query: {
      ...options?.query,
      enabled: branchSessionEnabled(branchId, sessionId, options?.query?.enabled),
    },
  });
}

export function getGetAttendanceSummaryQueryKey(
  branchId: number,
  sessionId: number,
  params?: { classId?: number },
) {
  return getGetAttendanceSummaryQueryKeyPhase0(branchId, sessionId, params);
}

export function useGetAttendanceSummary<
  TData = Awaited<ReturnType<typeof getAttendanceSummaryApi>>,
  TError = unknown,
>(
  branchId: number | null | undefined,
  sessionId: number | null | undefined,
  params?: { classId?: number },
  options?: QueryOpts<TData, TError>,
) {
  return useGetAttendanceSummaryPhase0(branchId ?? 0, sessionId ?? 0, params, {
    ...options,
    query: {
      ...options?.query,
      enabled: branchSessionEnabled(branchId, sessionId, options?.query?.enabled),
    },
  });
}

export const useMarkAttendance = <TError = unknown, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<
    unknown,
    TError,
    { branchId: number; sessionId: number; data: MarkAttendanceBody & { sectionId?: number } },
    TContext
  >;
}) => {
  const base = getMarkAttendanceMutationOptions(options as never);
  return useMutation({
    ...base,
    mutationFn: (vars: {
      branchId: number;
      sessionId: number;
      data: MarkAttendanceBody & { sectionId?: number };
    }) =>
      markAttendanceApi(vars.branchId, vars.sessionId, {
        ...vars.data,
        sectionId: vars.data.sectionId ?? 1,
      }),
  });
};

export function getListFeeRecordsQueryKey(
  branchId: number,
  sessionId: number,
  params?: ListFeeRecordsParams,
): QueryKey {
  return getListFeeRecordsQueryKeyPhase0(branchId, sessionId, params);
}

export function useListFeeRecords<
  TData = Awaited<ReturnType<typeof listFeeRecordsApi>>,
  TError = unknown,
>(
  branchId: number | null | undefined,
  sessionId: number | null | undefined,
  params?: ListFeeRecordsParams,
  options?: QueryOpts<TData, TError>,
) {
  return useListFeeRecordsPhase0(branchId ?? 0, sessionId ?? 0, params, {
    ...options,
    query: {
      ...options?.query,
      enabled: branchSessionEnabled(branchId, sessionId, options?.query?.enabled),
    },
  });
}

export function getGetFeeSummaryQueryKey(branchId: number, sessionId: number) {
  return getGetFeeSummaryQueryKeyPhase0(branchId, sessionId);
}

export function useGetFeeSummary<
  TData = Awaited<ReturnType<typeof getFeeSummaryApi>>,
  TError = unknown,
>(
  branchId: number | null | undefined,
  sessionId: number | null | undefined,
  _params?: Record<string, never>,
  options?: QueryOpts<TData, TError>,
) {
  return useGetFeeSummaryPhase0(branchId ?? 0, sessionId ?? 0, {
    ...options,
    query: {
      ...options?.query,
      enabled: branchSessionEnabled(branchId, sessionId, options?.query?.enabled),
    },
  });
}

export const useRecordFeePayment = <TError = unknown, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<
    unknown,
    TError,
    { branchId: number; sessionId: number; feeId: number; data: RecordFeePaymentBody },
    TContext
  >;
}) => {
  const base = getRecordFeePaymentMutationOptions(options as never);
  return useMutation({
    ...base,
    mutationFn: (vars: {
      branchId: number;
      sessionId: number;
      feeId: number;
      data: RecordFeePaymentBody;
    }) => recordFeePaymentApi(vars.branchId, vars.sessionId, vars.feeId, vars.data),
  });
};

export function getListAnnouncementsQueryKey(
  branchId: number,
  params?: ListAnnouncementsParams,
): QueryKey {
  return getListAnnouncementsQueryKeyPhase0(branchId, params);
}

export function useListAnnouncements<
  TData = Awaited<ReturnType<typeof listAnnouncementsApi>>,
  TError = unknown,
>(
  branchId: number | null | undefined,
  params?: ListAnnouncementsParams,
  options?: QueryOpts<TData, TError>,
) {
  return useListAnnouncementsPhase0(branchId ?? 0, params, {
    ...options,
    query: {
      ...options?.query,
      enabled: branchOnlyEnabled(branchId, options?.query?.enabled),
    },
  });
}

export const useCreateAnnouncement = <TError = unknown, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<
    unknown,
    TError,
    { branchId: number; data: CreateAnnouncementBody },
    TContext
  >;
}) => {
  const base = getCreateAnnouncementMutationOptions(options as never);
  return useMutation({
    ...base,
    mutationFn: (vars: { branchId: number; data: CreateAnnouncementBody }) =>
      createAnnouncementApi(vars.branchId, vars.data),
  });
};

export const useDeleteAnnouncement = <TError = unknown, TContext = unknown>(options?: {
  mutation?: UseMutationOptions<
    unknown,
    TError,
    { branchId: number; announcementId: number },
    TContext
  >;
}) => {
  const base = getDeleteAnnouncementMutationOptions(options as never);
  return useMutation({
    ...base,
    mutationFn: (vars: { branchId: number; announcementId: number }) =>
      deleteAnnouncementApi(vars.branchId, vars.announcementId),
  });
};

export function getGetSchoolDashboardQueryKey(branchId: number): QueryKey {
  return getGetBranchDashboardQueryKeyPhase0(branchId);
}

export function useGetSchoolDashboard<
  TData = Awaited<ReturnType<typeof getBranchDashboardApi>>,
  TError = unknown,
>(
  branchId: number | null | undefined,
  options?: QueryOpts<TData, TError>,
) {
  return useGetBranchDashboardPhase0(branchId ?? 0, {
    ...options,
    query: {
      ...options?.query,
      enabled: branchOnlyEnabled(branchId, options?.query?.enabled),
    },
  });
}

export function getGetRecentActivityQueryKey(branchId: number, params?: { limit?: number }) {
  return getListAuditEventsQueryKeyPhase0(branchId, params);
}

export function useGetRecentActivity<
  TData = Awaited<ReturnType<typeof listAuditEventsApi>>,
  TError = unknown,
>(
  branchId: number | null | undefined,
  params?: { limit?: number },
  options?: QueryOpts<TData, TError>,
) {
  return useListAuditEventsPhase0(branchId ?? 0, params, {
    ...options,
    query: {
      ...options?.query,
      enabled: branchOnlyEnabled(branchId, options?.query?.enabled),
    },
  });
}

export {
  useHealthCheck,
  useListSchools,
  useListSocieties,
  useCreateSchool,
  useGetSchool,
  useUpdateSchool,
  useGetBranch,
  useGetSociety,
  getListSchoolsQueryKey,
  getListSocietiesQueryKey,
  getGetSchoolQueryKey,
  getListSchoolBranchesQueryKey,
  useGetPlatformDashboard,
  getGetPlatformDashboardQueryKey,
  useListSchoolBranches,
  getCurrentSession,
} from "./generated/api";

export { UserRole } from "./generated/api.schemas";
export type * from "./generated/api.schemas";
