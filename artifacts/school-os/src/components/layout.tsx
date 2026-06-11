import { ReactNode } from "react";

import { Link, useLocation } from "wouter";

import { useAuthStore } from "@/lib/auth";

import type { UserRole } from "@/lib/auth-types";

import {

  LayoutDashboard,

  Users,

  UserSquare2,

  GraduationCap,

  CalendarCheck,

  CreditCard,

  Megaphone,

  ActivitySquare,

  LogOut,

  Building,

  BarChart3,

  Settings,

  BookOpen,

  FileText,

  ClipboardList,

} from "lucide-react";

import { Button } from "@/components/ui/button";



interface LayoutProps {

  children: ReactNode;

  variant?: "admin" | "portal";

}



export function Layout({ children, variant = "admin" }: LayoutProps) {

  const [location, setLocation] = useLocation();

  const { user, logout } = useAuthStore();



  const handleLogout = async () => {

    await logout();

    setLocation("/login");

  };



  if (!user) return null;



  const navItems: Array<{ href: string; label: string; icon: typeof LayoutDashboard; roles: UserRole[] }> =

    variant === "portal"

      ? [

          { href: "/parent/dashboard", label: "Home", icon: LayoutDashboard, roles: ["parent"] },

          { href: "/student/dashboard", label: "Home", icon: LayoutDashboard, roles: ["student"] },

        ]

      : [

          { href: "/platform", label: "Platform", icon: Building, roles: ["super_admin"] },

          {

            href: user.societyId ? `/societies/${user.societyId}` : "/societies",

            label: "Society",

            icon: Building,

            roles: ["society_admin"],

          },

          { href: "/schools", label: "Schools", icon: Building, roles: ["super_admin", "society_admin"] },

          { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["school_admin", "principal", "coordinator"] },

          { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["teacher"] },

          { href: "/accounts/dashboard", label: "Accounts", icon: CreditCard, roles: ["accountant"] },

          { href: "/school-settings", label: "School Settings", icon: Settings, roles: ["super_admin", "school_admin", "principal"] },

          { href: "/students", label: "Students", icon: Users, roles: ["school_admin", "principal", "teacher"] },

          { href: "/staff", label: "Staff", icon: UserSquare2, roles: ["school_admin", "principal"] },

          { href: "/classes", label: "Classes", icon: GraduationCap, roles: ["school_admin", "principal", "teacher"] },

          { href: "/subjects", label: "Subjects", icon: BookOpen, roles: ["school_admin", "principal", "teacher"] },

          { href: "/attendance", label: "Attendance", icon: CalendarCheck, roles: ["school_admin", "principal", "teacher"] },

          { href: "/staff-attendance", label: "Staff Attendance", icon: CalendarCheck, roles: ["school_admin", "principal"] },

          { href: "/examinations", label: "Examinations", icon: FileText, roles: ["school_admin", "principal", "teacher"] },

          { href: "/fees", label: "Fees", icon: CreditCard, roles: ["school_admin", "principal", "accountant"] },

          { href: "/fee-structure", label: "Fee Structure", icon: CreditCard, roles: ["school_admin", "principal"] },

          { href: "/udise", label: "UDISE", icon: ClipboardList, roles: ["super_admin", "school_admin", "principal"] },

          { href: "/announcements", label: "Announcements", icon: Megaphone, roles: ["school_admin", "principal", "teacher"] },

          { href: "/analytics", label: "Analytics", icon: BarChart3, roles: ["school_admin", "principal"] },

          { href: "/activity", label: "Activity Feed", icon: ActivitySquare, roles: ["school_admin", "principal"] },

        ];



  const filteredNav = navItems.filter((item) => item.roles.includes(user.role));



  return (

    <div className="flex min-h-screen bg-background text-foreground">

      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border shrink-0">

        <div className="p-6 flex items-center gap-3">

          <div className="w-8 h-8 bg-sidebar-primary rounded flex items-center justify-center">

            <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />

          </div>

          <span className="font-bold text-lg tracking-tight">School OS</span>

        </div>



        <nav className="flex-1 px-4 py-4 space-y-1">

          {filteredNav.map((item) => {

            const isActive = location === item.href || location.startsWith(item.href + "/");

            return (

              <Link key={item.href} href={item.href} className="block">

                <div

                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${

                    isActive

                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"

                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"

                  }`}

                >

                  <item.icon className="w-5 h-5" />

                  <span className="text-sm">{item.label}</span>

                </div>

              </Link>

            );

          })}

        </nav>



        <div className="p-4 border-t border-sidebar-border">

          <div className="flex items-center gap-3 mb-4 px-2">

            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center font-bold text-sm">

              {user.name.charAt(0)}

            </div>

            <div className="flex flex-col min-w-0">

              <span className="text-sm font-medium leading-none truncate">{user.name}</span>

              <span className="text-xs text-sidebar-foreground/50 mt-1 truncate">

                {user.userCode ?? user.role.replace("_", " ")}

              </span>

            </div>

          </div>

          <Button

            variant="ghost"

            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"

            onClick={() => void handleLogout()}

          >

            <LogOut className="w-4 h-4 mr-2" />

            Logout

          </Button>

        </div>

      </aside>



      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        <div className="flex-1 overflow-auto p-8">

          <div className="max-w-6xl mx-auto">{children}</div>

        </div>

      </main>

    </div>

  );

}


