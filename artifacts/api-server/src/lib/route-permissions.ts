import { PLATFORM_FULL_ACCESS } from "./effective-permissions";

export type RoutePermissionRule = {
  methods: string[];
  pattern: RegExp;
  permissions: string[];
  /** When true, caller must hold every permission in `permissions`. */
  requireAll?: boolean;
};

const READ = (module: string) => [`${module}.read`, `${module}.manage`];
const MANAGE = (module: string) => [`${module}.manage`];

export const ROUTE_PERMISSION_RULES: RoutePermissionRule[] = [
  {
    methods: ["GET"],
    pattern: /^\/platform\/dashboard$/,
    permissions: [PLATFORM_FULL_ACCESS],
  },
  {
    methods: ["GET", "PUT", "PATCH"],
    pattern: /^\/platform\/access-control(\/|$)/,
    permissions: [PLATFORM_FULL_ACCESS, "permissions.manage"],
  },
  {
    methods: ["GET", "PATCH", "PUT"],
    pattern: /^\/branches\/\d+\/access-control(\/|$)/,
    permissions: ["permissions.manage", "branch.manage"],
  },
  {
    methods: ["GET"],
    pattern: /^\/schools\/\d+\/access-control(\/|$)/,
    permissions: ["permissions.manage"],
  },
  {
    methods: ["GET", "PUT", "PATCH"],
    pattern: /^\/branches\/\d+\/users(\/|$)/,
    permissions: ["permissions.manage", "branch.manage"],
  },
  {
    methods: ["GET", "PATCH"],
    pattern: /^\/schools\/\d+\/profile$/,
    permissions: READ("school"),
  },
  {
    methods: ["GET", "POST", "PATCH"],
    pattern: /^\/schools\/\d+\/udise-snapshots(\/|$)/,
    permissions: READ("school"),
  },
  {
    methods: ["GET", "POST", "PATCH"],
    pattern: /^\/branches\/\d+\/sessions\/?$/,
    permissions: MANAGE("session"),
  },
  {
    methods: ["GET", "POST", "PATCH"],
    pattern: /^\/branches\/\d+\/financial-sessions\/?$/,
    permissions: MANAGE("session"),
  },
  {
    methods: ["GET"],
    pattern: /^\/branches\/\d+\/sessions\/\d+\/students(\/|$)/,
    permissions: READ("student"),
  },
  {
    methods: ["POST", "PATCH", "DELETE", "PUT"],
    pattern: /^\/branches\/\d+\/sessions\/\d+\/students(\/|$)/,
    permissions: MANAGE("student"),
  },
  {
    methods: ["GET", "POST", "PATCH", "DELETE"],
    pattern: /^\/schools\/\d+\/document-master(\/|$)/,
    permissions: MANAGE("school"),
  },
  {
    methods: ["GET"],
    pattern: /^\/branches\/\d+\/sessions\/\d+\/classes(\/|$)/,
    permissions: READ("student"),
  },
  {
    methods: ["POST", "PATCH", "DELETE"],
    pattern: /^\/branches\/\d+\/sessions\/\d+\/classes(\/|$)/,
    permissions: MANAGE("class"),
  },
  {
    methods: ["GET", "POST", "PATCH", "DELETE"],
    pattern: /^\/branches\/\d+\/sessions\/\d+\/subjects(\/|$)/,
    permissions: MANAGE("class"),
  },
  {
    methods: ["GET", "POST", "PATCH", "DELETE"],
    pattern: /^\/branches\/\d+\/sessions\/\d+\/attendance(\/|$)/,
    permissions: MANAGE("attendance"),
  },
  {
    methods: ["GET", "POST"],
    pattern: /^\/branches\/\d+\/staff-attendance(\/|$)/,
    permissions: MANAGE("attendance"),
  },
  {
    methods: ["GET", "POST", "PATCH"],
    pattern: /^\/branches\/\d+\/sessions\/\d+\/fees(\/|$)/,
    permissions: MANAGE("fees"),
  },
  {
    methods: ["GET", "POST"],
    pattern: /^\/branches\/\d+\/fee-heads(\/|$)/,
    permissions: MANAGE("fees"),
  },
  {
    methods: ["GET", "POST"],
    pattern: /^\/branches\/\d+\/sessions\/\d+\/fee-structures(\/|$)/,
    permissions: MANAGE("fees"),
  },
  {
    methods: ["GET", "POST", "PATCH", "DELETE"],
    pattern: /^\/branches\/\d+\/sessions\/\d+\/billing-runs(\/|$)/,
    permissions: MANAGE("fees"),
  },
  {
    methods: ["GET", "POST", "PATCH", "DELETE"],
    pattern: /^\/branches\/\d+\/sessions\/\d+\/invoices(\/|$)/,
    permissions: [MANAGE("fees")[0], "fees.collect"],
  },
  {
    methods: ["GET", "POST", "PATCH", "DELETE"],
    pattern: /^\/branches\/\d+\/sessions\/\d+\/payments(\/|$)/,
    permissions: ["fees.collect", MANAGE("fees")[0]],
  },
  {
    methods: ["GET"],
    pattern: /^\/branches\/\d+\/sessions\/\d+\/receipts(\/|$)/,
    permissions: ["fees.collect", MANAGE("fees")[0]],
  },
  {
    methods: ["GET"],
    pattern: /^\/branches\/\d+\/sessions\/\d+\/reports\/(daily-collection|outstanding)$/,
    permissions: MANAGE("fees"),
  },
  {
    methods: ["GET", "PATCH"],
    pattern: /^\/branches\/\d+\/sessions\/\d+\/billing-settings(\/|$)/,
    permissions: MANAGE("fees"),
  },
  {
    methods: ["GET", "POST", "PATCH"],
    pattern: /^\/branches\/\d+\/invoice-templates(\/|$)/,
    permissions: MANAGE("fees"),
  },
  {
    methods: ["GET", "POST", "PATCH", "DELETE"],
    pattern: /^\/branches\/\d+\/sessions\/\d+\/students\/\d+\/fee-assignments(\/|$)/,
    permissions: MANAGE("fees"),
  },
  {
    methods: ["GET", "POST"],
    pattern: /^\/branches\/\d+\/sessions\/\d+\/students\/\d+\/invoices(\/|$)/,
    permissions: [MANAGE("fees")[0], "fees.collect"],
  },
  {
    methods: ["GET"],
    pattern: /^\/branches\/\d+\/sessions\/\d+\/students\/\d+\/(outstanding|ledger)$/,
    permissions: [MANAGE("fees")[0], "fees.collect"],
  },
  {
    methods: ["GET"],
    pattern: /^\/branches\/\d+\/sessions\/\d+\/students\/search$/,
    permissions: ["fees.collect", MANAGE("fees")[0]],
  },
  {
    methods: ["POST"],
    pattern: /^\/branches\/\d+\/sessions\/\d+\/fee-structures\/clone$/,
    permissions: MANAGE("fees"),
  },
  {
    methods: ["GET", "POST", "PATCH", "DELETE"],
    pattern: /^\/branches\/\d+\/sessions\/\d+\/exams(\/|$)/,
    permissions: MANAGE("class"),
  },
  {
    methods: ["GET", "POST"],
    pattern: /^\/branches\/\d+\/announcements(\/|$)/,
    permissions: MANAGE("announcements"),
  },
  {
    methods: ["GET"],
    pattern: /^\/branches\/\d+\/audit-events$/,
    permissions: ["audit.read"],
  },
  {
    methods: ["GET"],
    pattern: /^\/branches\/\d+\/sessions\/\d+\/analytics(\/|$)/,
    permissions: READ("student"),
  },
];

export function resolveRoutePermissions(method: string, path: string): string[] | null {
  const upperMethod = method.toUpperCase();
  for (const rule of ROUTE_PERMISSION_RULES) {
    if (!rule.methods.includes(upperMethod)) continue;
    if (!rule.pattern.test(path)) continue;
    return rule.permissions;
  }
  return null;
}

export function routePermissionSatisfied(
  permissions: string[],
  required: string[],
  requireAll = false,
): boolean {
  if (permissions.includes(PLATFORM_FULL_ACCESS)) return true;
  return requireAll
    ? required.every((key) => permissions.includes(key))
    : required.some((key) => permissions.includes(key));
}
