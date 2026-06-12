import { useAuthStore } from "@/lib/auth";
import type { RoleScopeTier, UserRole } from "@/lib/auth-types";

export type ScopeState = {
  tier: RoleScopeTier;
  role: UserRole | null;
  societyId: number | null;
  schoolId: number | null;
  branchId: number | null;
  sessionId: number | null;
  financialSessionId: number | null;
  studentId: number | null;
  isReady: boolean;
  requiresBranchContext: boolean;
  requiresStudentContext: boolean;
};

const BRANCH_OPS_ROLES: UserRole[] = [
  "school_admin",
  "principal",
  "coordinator",
  "teacher",
  "accountant",
];

export function useScope(): ScopeState {
  const { user, activeContext } = useAuthStore();

  if (!user) {
    return {
      tier: "platform",
      role: null,
      societyId: null,
      schoolId: null,
      branchId: null,
      sessionId: null,
      financialSessionId: null,
      studentId: null,
      isReady: false,
      requiresBranchContext: false,
      requiresStudentContext: false,
    };
  }

  const ctx = activeContext ?? {};
  const societyId = ctx.societyId ?? user.societyId ?? null;
  const schoolId = ctx.schoolId ?? user.schoolId ?? null;
  const branchId = ctx.branchId ?? user.branchId ?? null;
  const sessionId = ctx.sessionId ?? user.sessionId ?? null;
  const financialSessionId = ctx.financialSessionId ?? user.financialSessionId ?? null;
  const studentId = ctx.studentId ?? user.studentId ?? null;

  switch (user.role) {
    case "super_admin":
      return {
        tier: "platform",
        role: user.role,
        societyId: ctx.societyId ?? null,
        schoolId: ctx.schoolId ?? null,
        branchId: ctx.branchId ?? null,
        sessionId: ctx.sessionId ?? null,
        financialSessionId: ctx.financialSessionId ?? null,
        studentId: null,
        isReady: true,
        requiresBranchContext: false,
        requiresStudentContext: false,
      };

    case "society_admin":
      return {
        tier: "society",
        role: user.role,
        societyId,
        schoolId: ctx.schoolId ?? null,
        branchId: null,
        sessionId: null,
        financialSessionId: null,
        studentId: null,
        isReady: societyId != null,
        requiresBranchContext: false,
        requiresStudentContext: false,
      };

    case "school_admin":
      return {
        tier: "school",
        role: user.role,
        societyId,
        schoolId,
        branchId,
        sessionId,
        financialSessionId,
        studentId: null,
        isReady: schoolId != null,
        requiresBranchContext: true,
        requiresStudentContext: false,
      };

    case "parent":
    case "student":
      return {
        tier: "branch",
        role: user.role,
        societyId,
        schoolId,
        branchId: null,
        sessionId: null,
        financialSessionId: null,
        studentId,
        isReady: studentId != null,
        requiresBranchContext: false,
        requiresStudentContext: true,
      };

    default:
      return {
        tier: "branch",
        role: user.role,
        societyId,
        schoolId,
        branchId,
        sessionId,
        financialSessionId,
        studentId: null,
        isReady: branchId != null && sessionId != null,
        requiresBranchContext: BRANCH_OPS_ROLES.includes(user.role),
        requiresStudentContext: false,
      };
  }
}

export function useOperationalScope() {
  const scope = useScope();
  if (!scope.branchId || !scope.sessionId) {
    return null;
  }
  return {
    branchId: scope.branchId,
    sessionId: scope.sessionId,
    financialSessionId: scope.financialSessionId,
    schoolId: scope.schoolId,
    societyId: scope.societyId,
  };
}
