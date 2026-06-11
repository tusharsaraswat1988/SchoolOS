import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import type { UserRole } from "@/lib/auth-types";
import { useScope } from "@/lib/use-scope";

type GuardProps = {
  children: ReactNode;
  roles?: UserRole[];
  requireBranch?: boolean;
  requireStudent?: boolean;
  requireSchool?: boolean;
};

export function ProtectedRoute({
  children,
  roles,
  requireBranch,
  requireStudent,
  requireSchool,
}: GuardProps) {
  const [, setLocation] = useLocation();
  const { user, isHydrated } = useAuthStore();
  const scope = useScope();

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      setLocation("/login");
      return;
    }
    if (roles && !roles.includes(user.role)) {
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
  if (roles && !roles.includes(user.role)) return null;
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
