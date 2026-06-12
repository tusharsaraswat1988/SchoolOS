import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import {
  ADMIN_NAV_REGISTRY,
  PORTAL_NAV_REGISTRY,
  type NavItemDef,
} from "@/lib/navigation-registry";
import {
  PLATFORM_NAV_SECTIONS,
  PLATFORM_SCHOOL_OPS_ITEMS,
} from "@/lib/platform-navigation";
import { hasAnyPermission } from "@/lib/permissions";
import { useScope } from "@/lib/use-scope";
import { useWorkspaceContext } from "@/lib/use-workspace-context";
import {
  Building2,
  GraduationCap,
  LogOut,
  MapPin,
  Wrench,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface LayoutProps {
  children: ReactNode;
  variant?: "admin" | "portal";
}

function resolveHref(item: NavItemDef, societyId: number | null | undefined): string {
  if (item.key === "society" && societyId) {
    return `/societies/${societyId}`;
  }
  return item.href;
}

function filterNavItems(
  items: NavItemDef[],
  permissions: string[],
  role: string | undefined,
): NavItemDef[] {
  return items.filter((item) => {
    if (item.key === "my-access") return true;
    if (item.roles.length > 0) {
      if (!role || !item.roles.includes(role as NavItemDef["roles"][number])) {
        return false;
      }
    }
    if (item.permissions.length > 0) {
      return hasAnyPermission(permissions, item.permissions);
    }
    return role != null && item.roles.includes(role as NavItemDef["roles"][number]);
  });
}

function isNavItemActive(location: string, href: string): boolean {
  if (href === "/platform") return location === "/platform";
  return location === href || location.startsWith(`${href}/`);
}

function renderNavMenu(items: NavItemDef[], location: string, societyId: number | null | undefined) {
  return (
    <SidebarMenu>
      {items.map((item) => {
        const href = resolveHref(item, societyId);
        const isActive = isNavItemActive(location, href);
        return (
          <SidebarMenuItem key={item.key}>
            <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
              <Link href={href}>
                <item.icon />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function Layout({ children, variant = "admin" }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, logout, permissions, setContext } = useAuthStore();
  const scope = useScope();
  const workspace = useWorkspaceContext(variant);
  const isPlatformConsole = variant === "admin" && user?.role === "super_admin";
  const supportModeActive =
    isPlatformConsole &&
    scope.schoolId != null &&
    scope.branchId != null &&
    scope.sessionId != null;

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  if (!user) return null;

  const registry = variant === "portal" ? PORTAL_NAV_REGISTRY : ADMIN_NAV_REGISTRY;
  const filteredNav = filterNavItems(registry, permissions, user.role);

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-start gap-3 px-2 py-3 group-data-[collapsible=icon]:justify-center">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary">
              <GraduationCap className="size-5 text-sidebar-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5 group-data-[collapsible=icon]:hidden">
              <div>
                <p className="truncate font-bold text-lg tracking-tight leading-none">School OS</p>
                <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-sidebar-primary">
                  {workspace.panelLabel}
                </p>
              </div>
              {workspace.contextLine && (
                <p className="truncate text-[10px] text-sidebar-foreground/45">{workspace.contextLine}</p>
              )}
              {workspace.schoolLine && (
                <div className="flex items-start gap-1.5 text-[11px] leading-snug text-sidebar-foreground/75">
                  <Building2 className="mt-0.5 size-3 shrink-0 opacity-70" />
                  <span className="truncate">{workspace.schoolLine}</span>
                </div>
              )}
              {workspace.branchLine && (
                <div className="flex items-start gap-1.5 text-[11px] leading-snug text-sidebar-foreground/65">
                  <MapPin className="mt-0.5 size-3 shrink-0 opacity-70" />
                  <span className="truncate">{workspace.branchLine}</span>
                </div>
              )}
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {isPlatformConsole ? (
            PLATFORM_NAV_SECTIONS.map((section) => {
              const sectionItems =
                section.id === "school-support" && supportModeActive
                  ? [...section.items, ...PLATFORM_SCHOOL_OPS_ITEMS]
                  : section.items;

              return (
                <SidebarGroup key={section.id}>
                  <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    {renderNavMenu(sectionItems, location, user.societyId)}
                  </SidebarGroupContent>
                </SidebarGroup>
              );
            })
          ) : (
            <SidebarGroup>
              <SidebarGroupContent>
                {renderNavMenu(filteredNav, location, user.societyId)}
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-2 group-data-[collapsible=icon]:justify-center">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sm font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-medium leading-none">{user.name}</span>
              <span className="mt-1 truncate text-xs text-sidebar-foreground/50">
                {user.userCode ?? user.role.replace("_", " ")}
              </span>
            </div>
          </div>
          <SidebarMenu>
            {supportModeActive && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Exit support mode"
                  className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
                  onClick={() => {
                    setContext(null);
                    setLocation("/platform/school-ops");
                  }}
                >
                  <Wrench />
                  <span>Exit support mode</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Logout"
                className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
                onClick={() => void handleLogout()}
              >
                <LogOut />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className="flex h-svh flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="min-w-0 flex-1 md:hidden">
            <p className="truncate text-sm font-medium">{workspace.panelLabel}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[workspace.schoolLine, workspace.branchLine].filter(Boolean).join(" · ") || "School OS"}
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
