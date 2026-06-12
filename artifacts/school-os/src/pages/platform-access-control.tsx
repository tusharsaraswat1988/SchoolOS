import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiSend } from "@/lib/api";
import { Shield } from "lucide-react";

type PermissionRow = { id: number; key: string; module: string; action: string; description: string | null };
type RoleRow = { id: number; key: string; name: string; scope: string };
type AuditEvent = {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  entityLabel: string | null;
  createdAt: string;
};

export default function PlatformAccessControlPage() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [selectedRole, setSelectedRole] = useState("teacher");
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const permissionsByModule = useMemo(() => {
    const groups = new Map<string, PermissionRow[]>();
    for (const permission of permissions) {
      const list = groups.get(permission.module) ?? [];
      list.push(permission);
      groups.set(permission.module, list);
    }
    return [...groups.entries()];
  }, [permissions]);

  async function loadOverview() {
    const data = await apiGet<{
      roles: RoleRow[];
      permissions: PermissionRow[];
      roleMatrix: Array<{ roleKey: string; permissions: string[] }>;
      auditEvents: AuditEvent[];
    }>("/platform/access-control/overview");
    setRoles(data.roles);
    setPermissions(data.permissions);
    setAuditEvents(data.auditEvents);
    const current = data.roleMatrix.find((row) => row.roleKey === selectedRole);
    setRolePermissions(current?.permissions ?? []);
  }

  useEffect(() => {
    loadOverview()
      .catch((e) => toast({ title: "Failed to load platform access control", description: String(e), variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    apiGet<{ permissionKeys: string[] }>(`/platform/access-control/roles/${selectedRole}/permissions`)
      .then((data) => setRolePermissions(data.permissionKeys))
      .catch(() => setRolePermissions([]));
  }, [selectedRole]);

  async function saveRolePermissions() {
    setSaving(true);
    try {
      await apiSend(`/platform/access-control/roles/${selectedRole}/permissions`, "PUT", {
        permissionKeys: rolePermissions,
      });
      toast({ title: "Role permissions saved" });
      await loadOverview();
    } catch (e) {
      toast({ title: "Save failed", description: String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function togglePermission(key: string, checked: boolean) {
    setRolePermissions((prev) =>
      checked ? [...new Set([...prev, key])] : prev.filter((entry) => entry !== key),
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="size-8 text-primary" />
              Platform Access Control
            </h1>
            <p className="text-muted-foreground mt-1">
              Global role templates inherited by every school tenant.
            </p>
          </div>
          <Link href="/platform" className="text-sm text-primary underline-offset-4 hover:underline">
            ← Platform overview
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <Tabs defaultValue="templates">
            <TabsList>
              <TabsTrigger value="templates">Role templates</TabsTrigger>
              <TabsTrigger value="audit">Audit log</TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Edit role template</CardTitle>
                  <CardDescription>
                    Changes apply platform-wide to all schools using this role.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-[260px]">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.key} value={role.key}>
                          {role.name} ({role.scope})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="space-y-4">
                    {permissionsByModule.map(([module, modulePermissions]) => (
                      <div key={module}>
                        <h3 className="text-sm font-semibold capitalize mb-2">{module}</h3>
                        <div className="grid gap-2 md:grid-cols-2">
                          {modulePermissions.map((permission) => (
                            <label
                              key={permission.key}
                              className="flex items-start gap-2 rounded-md border p-3 text-sm"
                            >
                              <Checkbox
                                checked={rolePermissions.includes(permission.key)}
                                onCheckedChange={(checked) =>
                                  togglePermission(permission.key, checked === true)
                                }
                              />
                              <span>
                                <span className="font-medium">
                                  {permission.description ?? permission.key}
                                </span>
                                <code className="block text-xs text-muted-foreground mt-1">
                                  {permission.key}
                                </code>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button onClick={() => void saveRolePermissions()} disabled={saving}>
                    {saving ? "Saving…" : "Save role template"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent permission changes</CardTitle>
                </CardHeader>
                <CardContent>
                  {auditEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No RBAC audit events yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {auditEvents.map((event) => (
                        <li key={event.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                          <div>
                            <div className="font-medium">{event.entityLabel ?? event.entityId}</div>
                            <div className="text-xs text-muted-foreground">
                              {event.entityType} · {event.action}
                            </div>
                          </div>
                          <Badge variant="outline">
                            {new Date(event.createdAt).toLocaleString()}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
}
