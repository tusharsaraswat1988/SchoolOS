export const PLATFORM_FULL_ACCESS = "platform.full_access";

export function hasPermission(permissions: string[], key: string): boolean {
  if (permissions.includes(PLATFORM_FULL_ACCESS)) return true;
  return permissions.includes(key);
}

export function hasAnyPermission(permissions: string[], keys: string[]): boolean {
  if (!keys.length) return true;
  if (permissions.includes(PLATFORM_FULL_ACCESS)) return true;
  return keys.some((key) => permissions.includes(key));
}

export function hasAllPermissions(permissions: string[], keys: string[]): boolean {
  if (!keys.length) return true;
  if (permissions.includes(PLATFORM_FULL_ACCESS)) return true;
  return keys.every((key) => permissions.includes(key));
}
