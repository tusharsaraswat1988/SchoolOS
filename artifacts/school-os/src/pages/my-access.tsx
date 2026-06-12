import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/auth";
import { ADMIN_NAV_REGISTRY } from "@/lib/navigation-registry";
import { hasAnyPermission } from "@/lib/permissions";

function canSeeNavItem(
  permissions: string[],
  role: string | undefined,
  requiredPermissions: string[],
  fallbackRoles: string[],
): boolean {
  if (permissions.includes("platform.full_access")) return true;
  if (requiredPermissions.length > 0) {
    return hasAnyPermission(permissions, requiredPermissions);
  }
  return role != null && fallbackRoles.includes(role);
}

export default function MyAccessPage() {
  const { user, permissions } = useAuthStore();

  const visibleNav = ADMIN_NAV_REGISTRY.filter(
    (item) =>
      item.key === "my-access" ||
      canSeeNavItem(permissions, user?.role, item.permissions, item.roles),
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Access</h1>
          <p className="text-muted-foreground mt-1">
            Effective permissions loaded from your role and any user-specific overrides.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Signed in as</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Name:</span> {user?.name}
            </p>
            <p>
              <span className="text-muted-foreground">Role:</span>{" "}
              <Badge variant="secondary">{user?.role?.replace("_", " ")}</Badge>
            </p>
            <p>
              <span className="text-muted-foreground">Scope:</span> {user?.roleScope}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Effective permissions ({permissions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {permissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No permissions assigned.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {permissions.map((permission) => (
                  <Badge key={permission} variant="outline">
                    {permission}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Navigation you can see</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {visibleNav.map((item) => (
                <li key={item.key} className="flex items-center justify-between border-b py-2 last:border-0">
                  <span>{item.label}</span>
                  <code className="text-xs text-muted-foreground">{item.href}</code>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
