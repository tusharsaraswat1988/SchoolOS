import type { LucideIcon } from "lucide-react";
import {
  Building,
  Building2,
  CalendarRange,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  School,
  Settings,
  Shield,
  Users,
  Wrench,
} from "lucide-react";
import type { NavItemDef } from "@/lib/navigation-registry";

export type PlatformNavSection = {
  id: "admin" | "organizations" | "school-support";
  label: string;
  description: string;
  items: NavItemDef[];
};

const platformItem = (
  key: string,
  href: string,
  label: string,
  icon: LucideIcon,
): NavItemDef => ({
  key,
  href,
  label,
  icon,
  permissions: ["platform.full_access"],
  roles: ["super_admin"],
});

export const PLATFORM_NAV_SECTIONS: PlatformNavSection[] = [
  {
    id: "admin",
    label: "Platform Admin",
    description: "Settings, credentials, and sub-admin roles",
    items: [
      platformItem("platform-dashboard", "/platform", "Dashboard", LayoutDashboard),
      platformItem("platform-admin-hub", "/platform/admin", "Settings & Team", Shield),
      platformItem("platform-access-control", "/platform/access-control", "Access Control", Shield),
      platformItem("my-access", "/my-access", "My Access", Shield),
    ],
  },
  {
    id: "organizations",
    label: "Organizations",
    description: "Societies, schools, and tenant setup",
    items: [
      platformItem("platform-societies", "/platform/organizations/societies", "Societies", Building2),
      platformItem("platform-schools", "/platform/organizations/schools", "Schools", School),
    ],
  },
  {
    id: "school-support",
    label: "School Support",
    description: "Inspect or fix data for a specific school",
    items: [
      platformItem("school-ops-picker", "/platform/school-ops", "Select School", Wrench),
    ],
  },
];

/** Shown in School Support when a branch context is active. */
export const PLATFORM_SCHOOL_OPS_ITEMS: NavItemDef[] = [
  platformItem("ops-sessions", "/sessions", "Sessions", CalendarRange),
  platformItem("ops-school-settings", "/school-settings", "School Settings", Settings),
  platformItem("ops-students", "/students", "Students", Users),
  platformItem("ops-fees", "/fees", "Fees", CreditCard),
  platformItem("ops-fee-structure", "/fee-structure", "Fee Structure", CreditCard),
  platformItem("ops-classes", "/classes", "Classes", GraduationCap),
  platformItem("ops-access-control", "/access-control", "School Access", Shield),
];

export const PLATFORM_ORG_HUB_LINKS = [
  {
    title: "Societies",
    description: "Create and manage net societies that own schools.",
    href: "/platform/organizations/societies",
    icon: Building2,
  },
  {
    title: "Schools",
    description: "Register schools, codes, plans, and branch structure.",
    href: "/platform/organizations/schools",
    icon: Building,
  },
] as const;

export const PLATFORM_ADMIN_HUB_LINKS = [
  {
    title: "Access Control",
    description: "Role templates, permissions, and platform sub-admins.",
    href: "/platform/access-control",
    icon: Shield,
  },
  {
    title: "My Access",
    description: "View your own roles and effective permissions.",
    href: "/my-access",
    icon: Shield,
  },
] as const;
