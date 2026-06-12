import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import type { UserRole } from "@/lib/auth-types";
import { hasAnyPermission } from "@/lib/permissions";
import { useScope } from "@/lib/use-scope";

type GuardProps = {
  children: ReactNode;
  roles?: UserRole[];
  permissions?: string[];
  requireBranch?: boolean;
  requireStudent?: boolean;
  requireSchool?: boolean;
};

export function ProtectedRoute({
  children,
  roles,
  permissions,
  requireBranch,
  requireStudent,
  requireSchool,
}: GuardProps) {
  const [, setLocation] = useLocation();
  const { user, isHydrated, permissions: userPermissions } = useAuthStore();
  const scope = useScope();

  const permissionOk =
    !permissions ||
    permissions.length === 0 ||
    hasAnyPermission(userPermissions, permissions);

  const roleOk = !roles || (user != null && roles.includes(user.role));

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      setLocation("/login");
      return;
    }
    if (!permissionOk && !roleOk) {
      setLocation(defaultHomeForRole(user.role));
      return;
    }
    if (roles && !roles.includes(user.role) && !permissionOk) {
      setLocation(defaultHomeForRole(user.role));
      return;
    }
    if (requireSchool && !scope.schoolId && user.role !== "super_admin") {
      setLocation(defaultHomeForRole(user.role));
      return;
    }
    if (requireBranch && (!scope.branchId || !scope.sessionId)) {
      if (user.role === "school_admin") {
        setLocation("/select-branch");
      } else if (user.role === "super_admin") {
        setLocation("/platform/school-ops");
      } else {
        setLocation(defaultHomeForRole(user.role));
      }
      return;
    }
    if (requireStudent && !scope.studentId) {
      setLocation(defaultHomeForRole(user.role));
    }
  }, [
    isHydrated,
    user,
    roles,
    permissions,
    permissionOk,
    roleOk,
    requireBranch,
    requireStudent,
    requireSchool,
    scope,
    setLocation,
  ]);

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading session…
      </div>
    );
  }

  if (!user) return null;
  if (!permissionOk && !roleOk) return null;
  if (roles && !roles.includes(user.role) && !permissionOk) return null;
  if (requireBranch && (!scope.branchId || !scope.sessionId)) return null;
  if (requireStudent && !scope.studentId) return null;

  return <>{children}</>;
}

export function defaultHomeForRole(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "/platform";
    case "society_admin":
      return "/societies";
    case "school_admin":
      return "/select-branch";
    case "teacher":
      return "/teacher/dashboard";
    case "accountant":
      return "/accounts/dashboard";
    case "parent":
      return "/parent/dashboard";
    case "student":
      return "/student/dashboard";
    default:
      return "/dashboard";
  }
}
