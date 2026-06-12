import { useGetBranch, useGetSchool, useGetSociety } from "@workspace/api-client-react";
import { useAuthStore } from "@/lib/auth";
import type { UserRole } from "@/lib/auth-types";
import { useScope } from "@/lib/use-scope";

const PANEL_LABELS: Record<UserRole, string> = {
  super_admin: "Platform Console",
  society_admin: "Society Console",
  school_admin: "School Admin Panel",
  principal: "Principal Panel",
  coordinator: "Coordinator Panel",
  teacher: "Teacher Panel",
  accountant: "Accounts Panel",
  parent: "Parent Portal",
  student: "Student Portal",
};

export type WorkspaceContext = {
  panelLabel: string;
  schoolLine: string | null;
  branchLine: string | null;
  contextLine: string | null;
};

function formatEntity(name: string, code?: string | null) {
  return code ? `${name} · ${code}` : name;
}

export function getPanelLabel(role: UserRole | undefined, variant: "admin" | "portal"): string {
  if (!role) return "School OS";
  if (variant === "portal") {
    return role === "student" ? "Student Portal" : "Parent Portal";
  }
  return PANEL_LABELS[role];
}

export function useWorkspaceContext(variant: "admin" | "portal" = "admin"): WorkspaceContext {
  const { user } = useAuthStore();
  const scope = useScope();
  const role = user?.role;

  const panelLabel = getPanelLabel(role, variant);

  const { data: school } = useGetSchool(scope.schoolId ?? 0, {
    query: { enabled: (scope.schoolId ?? 0) > 0 },
  });

  const { data: branch } = useGetBranch(scope.branchId ?? 0, {
    query: { enabled: (scope.branchId ?? 0) > 0 },
  });

  const { data: society } = useGetSociety(scope.societyId ?? 0, {
    query: { enabled: (scope.societyId ?? 0) > 0 && !scope.schoolId },
  });

  let schoolLine: string | null = null;
  let branchLine: string | null = null;
  let contextLine: string | null = null;

  if (role === "super_admin") {
    if (school) {
      contextLine = scope.branchId ? "School support mode" : "School selected — pick branch";
      schoolLine = formatEntity(school.name, school.code);
      branchLine = branch ? formatEntity(branch.name, branch.code) : null;
    } else {
      contextLine = "Multi-tenant · all societies";
    }
  } else if (role === "society_admin") {
    if (society) {
      schoolLine = formatEntity(society.name, society.code);
      contextLine = "All schools in society";
    } else if (scope.societyId) {
      schoolLine = `Society #${scope.societyId}`;
    }
    if (school) {
      schoolLine = formatEntity(school.name, school.code);
      contextLine = "School focus";
    }
  } else if (role === "parent" || role === "student") {
    if (school) {
      schoolLine = formatEntity(school.name, school.code);
    } else if (scope.schoolId) {
      schoolLine = `School #${scope.schoolId}`;
    }
    branchLine = branch ? formatEntity(branch.name, branch.code) : null;
  } else {
    if (school) {
      schoolLine = formatEntity(school.name, school.code);
    } else if (scope.schoolId) {
      schoolLine = `School #${scope.schoolId}`;
    }

    if (branch) {
      branchLine = formatEntity(branch.name, branch.code);
    } else if (scope.branchId) {
      branchLine = `Branch #${scope.branchId}`;
    } else if (role === "school_admin") {
      branchLine = "Branch not selected";
    }
  }

  return { panelLabel, schoolLine, branchLine, contextLine };
}
