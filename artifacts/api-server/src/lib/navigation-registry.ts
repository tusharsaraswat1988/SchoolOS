export type NavPortal = "admin" | "portal";

export type NavigationItemDef = {
  key: string;
  href: string;
  label: string;
  portal: NavPortal;
  /** User needs any one of these permissions (or matching legacy role). */
  permissions: string[];
  /** Fallback when permissions list is empty — kept for gradual migration. */
  roles?: string[];
};

export const NAVIGATION_REGISTRY: NavigationItemDef[] = [
  {
    key: "platform",
    href: "/platform",
    label: "Platform",
    portal: "admin",
    permissions: ["platform.full_access"],
    roles: ["super_admin"],
  },
  {
    key: "platform-access-control",
    href: "/platform/access-control",
    label: "Access Control",
    portal: "admin",
    permissions: ["platform.full_access"],
    roles: ["super_admin"],
  },
  {
    key: "society",
    href: "/societies",
    label: "Society",
    portal: "admin",
    permissions: ["society.manage"],
    roles: ["society_admin"],
  },
  {
    key: "schools",
    href: "/schools",
    label: "Schools",
    portal: "admin",
    permissions: ["school.manage", "platform.full_access"],
    roles: ["super_admin", "society_admin"],
  },
  {
    key: "dashboard",
    href: "/dashboard",
    label: "Admin Dashboard",
    portal: "admin",
    permissions: ["branch.manage", "student.read"],
    roles: ["school_admin", "principal", "coordinator"],
  },
  {
    key: "teacher-dashboard",
    href: "/teacher/dashboard",
    label: "Teacher Dashboard",
    portal: "admin",
    permissions: ["student.read", "attendance.manage"],
    roles: ["teacher"],
  },
  {
    key: "accounts-dashboard",
    href: "/accounts/dashboard",
    label: "Accounts Dashboard",
    portal: "admin",
    permissions: ["fees.manage"],
    roles: ["accountant"],
  },
  {
    key: "school-settings",
    href: "/school-settings",
    label: "School Settings",
    portal: "admin",
    permissions: ["school.manage"],
    roles: ["super_admin", "school_admin", "principal"],
  },
  {
    key: "access-control",
    href: "/access-control",
    label: "Access Control",
    portal: "admin",
    permissions: ["permissions.manage"],
    roles: ["school_admin", "principal"],
  },
  {
    key: "my-access",
    href: "/my-access",
    label: "My Access",
    portal: "admin",
    permissions: [],
    roles: [],
  },
  {
    key: "sessions",
    href: "/sessions",
    label: "Sessions",
    portal: "admin",
    permissions: ["session.manage"],
    roles: ["super_admin", "school_admin", "principal", "accountant"],
  },
  {
    key: "students",
    href: "/students",
    label: "Students",
    portal: "admin",
    permissions: ["student.read", "student.manage"],
    roles: ["school_admin", "principal", "teacher"],
  },
  {
    key: "staff",
    href: "/staff",
    label: "Staff",
    portal: "admin",
    permissions: ["branch.manage"],
    roles: ["school_admin", "principal"],
  },
  {
    key: "classes",
    href: "/classes",
    label: "Classes",
    portal: "admin",
    permissions: ["class.manage", "student.read"],
    roles: ["school_admin", "principal", "teacher"],
  },
  {
    key: "subjects",
    href: "/subjects",
    label: "Subjects",
    portal: "admin",
    permissions: ["class.manage", "student.read"],
    roles: ["school_admin", "principal", "teacher"],
  },
  {
    key: "attendance",
    href: "/attendance",
    label: "Attendance",
    portal: "admin",
    permissions: ["attendance.manage"],
    roles: ["school_admin", "principal", "teacher"],
  },
  {
    key: "staff-attendance",
    href: "/staff-attendance",
    label: "Staff Attendance",
    portal: "admin",
    permissions: ["attendance.manage", "branch.manage"],
    roles: ["school_admin", "principal"],
  },
  {
    key: "examinations",
    href: "/examinations",
    label: "Examinations",
    portal: "admin",
    permissions: ["class.manage", "student.read"],
    roles: ["school_admin", "principal", "teacher"],
  },
  {
    key: "fees",
    href: "/fees",
    label: "Fees",
    portal: "admin",
    permissions: ["fees.manage"],
    roles: ["school_admin", "principal", "accountant"],
  },
  {
    key: "fee-structure",
    href: "/fee-structure",
    label: "Fee Structure",
    portal: "admin",
    permissions: ["fees.manage"],
    roles: ["school_admin", "principal"],
  },
  {
    key: "udise",
    href: "/udise",
    label: "UDISE",
    portal: "admin",
    permissions: ["school.manage"],
    roles: ["super_admin", "school_admin", "principal"],
  },
  {
    key: "announcements",
    href: "/announcements",
    label: "Announcements",
    portal: "admin",
    permissions: ["announcements.manage"],
    roles: ["school_admin", "principal", "teacher"],
  },
  {
    key: "analytics",
    href: "/analytics",
    label: "Analytics",
    portal: "admin",
    permissions: ["student.read", "branch.manage"],
    roles: ["school_admin", "principal"],
  },
  {
    key: "activity",
    href: "/activity",
    label: "Activity Feed",
    portal: "admin",
    permissions: ["audit.read"],
    roles: ["school_admin", "principal"],
  },
  {
    key: "parent-home",
    href: "/parent/dashboard",
    label: "Home",
    portal: "portal",
    permissions: ["parent.child_read", "profile.self_read"],
    roles: ["parent"],
  },
  {
    key: "student-home",
    href: "/student/dashboard",
    label: "Home",
    portal: "portal",
    permissions: ["profile.self_read"],
    roles: ["student"],
  },
];

export function filterNavigationItems(
  items: NavigationItemDef[],
  permissions: string[],
  role: string,
  portal: NavPortal,
): NavigationItemDef[] {
  const superAdminPlatformHrefs = new Set([
    "/platform",
    "/platform/admin",
    "/platform/access-control",
    "/platform/organizations/societies",
    "/platform/organizations/schools",
    "/platform/school-ops",
    "/my-access",
    "/sessions",
    "/school-settings",
    "/students",
    "/fees",
    "/fee-structure",
    "/classes",
    "/access-control",
  ]);

  return items.filter((item) => {
    if (item.portal !== portal) return false;
    if (item.key === "my-access") return true;
    if (role === "super_admin" && portal === "admin") {
      return superAdminPlatformHrefs.has(item.href);
    }
    if (item.roles && item.roles.length > 0 && !item.roles.includes(role)) {
      return false;
    }
    if (item.permissions.length > 0) {
      return item.permissions.some((p) => permissions.includes(p));
    }
    if (item.roles && item.roles.length > 0) {
      return item.roles.includes(role);
    }
    return false;
  });
}
