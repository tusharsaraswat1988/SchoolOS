import type { AuthScopePayload } from "./auth-scope";
import { countSchoolBranches } from "./auth-scope";

export type LoginRedirect = {
  path: string;
  activeContext: {
    societyId?: number | null;
    schoolId?: number | null;
    branchId?: number | null;
    sessionId?: number | null;
    studentId?: number | null;
  } | null;
};

export async function resolveLoginRedirect(scope: AuthScopePayload): Promise<LoginRedirect> {
  switch (scope.role) {
    case "super_admin":
      return { path: "/platform", activeContext: null };

    case "society_admin":
      return {
        path: scope.societyId ? `/societies/${scope.societyId}` : "/platform",
        activeContext: scope.societyId ? { societyId: scope.societyId } : null,
      };

    case "school_admin": {
      if (!scope.schoolId) {
        return { path: "/login", activeContext: null };
      }
      const branchCount = await countSchoolBranches(scope.schoolId);
      if (branchCount <= 1 && scope.branchId && scope.sessionId) {
        return {
          path: "/dashboard",
          activeContext: {
            societyId: scope.societyId,
            schoolId: scope.schoolId,
            branchId: scope.branchId,
            sessionId: scope.sessionId,
          },
        };
      }
      if (branchCount <= 1 && scope.branchId) {
        return {
          path: "/select-branch",
          activeContext: { societyId: scope.societyId, schoolId: scope.schoolId, branchId: scope.branchId },
        };
      }
      return {
        path: "/select-branch",
        activeContext: { societyId: scope.societyId, schoolId: scope.schoolId },
      };
    }

    case "principal":
    case "coordinator":
      return {
        path: "/dashboard",
        activeContext: {
          societyId: scope.societyId,
          schoolId: scope.schoolId,
          branchId: scope.branchId,
          sessionId: scope.sessionId,
        },
      };

    case "teacher":
      return {
        path: "/teacher/dashboard",
        activeContext: {
          societyId: scope.societyId,
          schoolId: scope.schoolId,
          branchId: scope.branchId,
          sessionId: scope.sessionId,
        },
      };

    case "accountant":
      return {
        path: "/accounts/dashboard",
        activeContext: {
          societyId: scope.societyId,
          schoolId: scope.schoolId,
          branchId: scope.branchId,
          sessionId: scope.sessionId,
        },
      };

    case "parent":
      return {
        path: "/parent/dashboard",
        activeContext: { studentId: scope.studentId },
      };

    case "student":
      return {
        path: "/student/dashboard",
        activeContext: { studentId: scope.studentId },
      };

    default:
      return { path: "/dashboard", activeContext: null };
  }
}
