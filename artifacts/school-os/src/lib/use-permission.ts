import { useAuthStore } from "@/lib/auth";
import { hasAllPermissions, hasAnyPermission, hasPermission } from "@/lib/permissions";

export function usePermissions(): string[] {
  return useAuthStore((s) => s.permissions);
}

export function usePermission(key: string): boolean {
  const permissions = usePermissions();
  return hasPermission(permissions, key);
}

export function useAnyPermission(keys: string[]): boolean {
  const permissions = usePermissions();
  return hasAnyPermission(permissions, keys);
}

export function useAllPermissions(keys: string[]): boolean {
  const permissions = usePermissions();
  return hasAllPermissions(permissions, keys);
}

export function useCanAccessNav(requiredPermissions: string[], fallbackRoles: string[]): boolean {
  const permissions = usePermissions();
  const role = useAuthStore((s) => s.user?.role);
  if (permissions.includes("platform.full_access")) return true;
  if (requiredPermissions.length > 0) {
    return hasAnyPermission(permissions, requiredPermissions);
  }
  return role != null && fallbackRoles.includes(role);
}
