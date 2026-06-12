import type { LucideIcon } from "lucide-react";
import {
  ActivitySquare,
  BarChart3,
  BookOpen,
  Building,
  CalendarCheck,
  CalendarRange,
  ClipboardList,
  CreditCard,
  FileText,
  FileWarning,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Settings,
  Shield,
  UserSquare2,
  Users,
} from "lucide-react";
import type { UserRole } from "@/lib/auth-types";

export type NavItemDef = {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
  permissions: string[];
  roles: UserRole[];
};

export const ADMIN_NAV_REGISTRY: NavItemDef[] = [
  { key: "platform", href: "/platform", label: "Platform", icon: Building, permissions: ["platform.full_access"], roles: ["super_admin"] },
  { key: "platform-access-control", href: "/platform/access-control", label: "Access Control", icon: Shield, permissions: ["platform.full_access"], roles: ["super_admin"] },
  { key: "society", href: "/societies", label: "Society", icon: Building, permissions: ["society.manage"], roles: ["society_admin"] },
  { key: "schools", href: "/schools", label: "Schools", icon: Building, permissions: ["school.manage", "platform.full_access"], roles: ["super_admin", "society_admin"] },
  { key: "dashboard", href: "/dashboard", label: "Admin Dashboard", icon: LayoutDashboard, permissions: ["branch.manage", "student.read"], roles: ["school_admin", "principal", "coordinator"] },
  { key: "teacher-dashboard", href: "/teacher/dashboard", label: "Teacher Dashboard", icon: LayoutDashboard, permissions: ["student.read", "attendance.manage"], roles: ["teacher"] },
  { key: "accounts-dashboard", href: "/accounts/dashboard", label: "Accounts Dashboard", icon: CreditCard, permissions: ["fees.manage"], roles: ["accountant"] },
  { key: "school-settings", href: "/school-settings", label: "School Settings", icon: Settings, permissions: ["school.manage"], roles: ["super_admin", "school_admin", "principal"] },
  { key: "access-control", href: "/access-control", label: "Access Control", icon: Shield, permissions: ["permissions.manage"], roles: ["school_admin", "principal"] },
  { key: "my-access", href: "/my-access", label: "My Access", icon: Shield, permissions: [], roles: [] },
  { key: "sessions", href: "/sessions", label: "Sessions", icon: CalendarRange, permissions: ["session.manage"], roles: ["super_admin", "school_admin", "principal", "accountant"] },
  { key: "students", href: "/students", label: "Students", icon: Users, permissions: ["student.read", "student.manage"], roles: ["school_admin", "principal", "teacher"] },
  { key: "document-master", href: "/document-master", label: "Document Master", icon: FileText, permissions: ["school.manage"], roles: ["school_admin", "principal"] },
  { key: "document-dashboard", href: "/student-documents", label: "Doc Dashboard", icon: FileWarning, permissions: ["student.read"], roles: ["school_admin", "principal", "teacher"] },
  { key: "staff", href: "/staff", label: "Staff", icon: UserSquare2, permissions: ["branch.manage"], roles: ["school_admin", "principal"] },
  { key: "classes", href: "/classes", label: "Classes", icon: GraduationCap, permissions: ["class.manage", "student.read"], roles: ["school_admin", "principal", "teacher"] },
  { key: "subjects", href: "/subjects", label: "Subjects", icon: BookOpen, permissions: ["class.manage", "student.read"], roles: ["school_admin", "principal", "teacher"] },
  { key: "attendance", href: "/attendance", label: "Attendance", icon: CalendarCheck, permissions: ["attendance.manage"], roles: ["school_admin", "principal", "teacher"] },
  { key: "staff-attendance", href: "/staff-attendance", label: "Staff Attendance", icon: CalendarCheck, permissions: ["attendance.manage", "branch.manage"], roles: ["school_admin", "principal"] },
  { key: "examinations", href: "/examinations", label: "Examinations", icon: FileText, permissions: ["class.manage", "student.read"], roles: ["school_admin", "principal", "teacher"] },
  { key: "fees", href: "/fees", label: "Fees", icon: CreditCard, permissions: ["fees.manage"], roles: ["school_admin", "principal", "accountant"] },
  { key: "fee-structure", href: "/fee-structure", label: "Fee Structure", icon: CreditCard, permissions: ["fees.manage"], roles: ["school_admin", "principal"] },
  { key: "billing-invoice-settings", href: "/billing/invoice-settings", label: "Invoicing", icon: FileText, permissions: ["fees.manage"], roles: ["school_admin", "principal", "accountant"] },
  { key: "udise", href: "/udise", label: "UDISE", icon: ClipboardList, permissions: ["school.manage"], roles: ["super_admin", "school_admin", "principal"] },
  { key: "announcements", href: "/announcements", label: "Announcements", icon: Megaphone, permissions: ["announcements.manage"], roles: ["school_admin", "principal", "teacher"] },
  { key: "analytics", href: "/analytics", label: "Analytics", icon: BarChart3, permissions: ["student.read", "branch.manage"], roles: ["school_admin", "principal"] },
  { key: "activity", href: "/activity", label: "Activity Feed", icon: ActivitySquare, permissions: ["audit.read"], roles: ["school_admin", "principal"] },
];

export const PORTAL_NAV_REGISTRY: NavItemDef[] = [
  { key: "parent-home", href: "/parent/dashboard", label: "Home", icon: LayoutDashboard, permissions: ["parent.child_read", "profile.self_read"], roles: ["parent"] },
  { key: "student-home", href: "/student/dashboard", label: "Home", icon: LayoutDashboard, permissions: ["profile.self_read"], roles: ["student"] },
];

export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/platform": ["platform.full_access"],
  "/platform/admin": ["platform.full_access"],
  "/platform/organizations": ["platform.full_access"],
  "/platform/organizations/societies": ["platform.full_access"],
  "/platform/organizations/schools": ["platform.full_access"],
  "/platform/school-ops": ["platform.full_access"],
  "/platform/access-control": ["platform.full_access"],
  "/access-control": ["permissions.manage"],
  "/my-access": [],
  "/students": ["student.read", "student.manage"],
  "/document-master": ["school.manage"],
  "/student-documents": ["student.read"],
  "/fees": ["fees.manage"],
  "/attendance": ["attendance.manage"],
  "/announcements": ["announcements.manage"],
  "/analytics": ["student.read", "branch.manage"],
  "/activity": ["audit.read"],
  "/sessions": ["session.manage"],
  "/school-settings": ["school.manage"],
  "/staff": ["branch.manage"],
  "/classes": ["class.manage", "student.read"],
  "/subjects": ["class.manage", "student.read"],
  "/examinations": ["class.manage", "student.read"],
  "/fee-structure": ["fees.manage"],
  "/billing/invoice-settings": ["fees.manage"],
  "/udise": ["school.manage"],
  "/staff-attendance": ["attendance.manage", "branch.manage"],
};
