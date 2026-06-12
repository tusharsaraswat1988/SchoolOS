import { Fragment, useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { apiGet, apiSend } from "@/lib/api";
import { useOperationalScope } from "@/lib/use-scope";
import { Shield, Users } from "lucide-react";

type PermissionRow = { id: number; key: string; module: string; action: string; description: string | null };
type RoleMatrixRow = { roleKey: string; roleName: string; permissions: string[] };
type BranchUser = {
  id: number;
  name: string;
  mobile: string;
  roleKey: string;
  roleName: string;
  userCode: string | null;
  restrictionCount: number;
};
type SectionOption = { id: number; label: string };

const ROLE_TABS = [
  { key: "all", label: "All" },
  { key: "school_admin", label: "Administrators" },
  { key: "principal", label: "Principal" },
  { key: "coordinator", label: "Coordinators" },
  { key: "teacher", label: "Teachers" },
  { key: "accountant", label: "Accounts" },
];

export default function AccessControlPage() {
  const { user } = useAuthStore();
  const scope = useOperationalScope();
  const { toast } = useToast();
  const schoolId = user?.schoolId ?? scope?.schoolId ?? null;
  const branchId = scope?.branchId ?? user?.branchId ?? null;

  const [overview, setOverview] = useState<{
    permissions: PermissionRow[];
    roleMatrix: RoleMatrixRow[];
  } | null>(null);
  const [users, setUsers] = useState<BranchUser[]>([]);
  const [roleFilter, setRoleFilter] = useState("teacher");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loading, setLoading] = useState(true);

  const permissionsByModule = useMemo(() => {
    if (!overview) return [];
    const groups = new Map<string, PermissionRow[]>();
    for (const permission of overview.permissions) {
      const list = groups.get(permission.module) ?? [];
      list.push(permission);
      groups.set(permission.module, list);
    }
    return [...groups.entries()];
  }, [overview]);

  async function loadOverview() {
    if (!schoolId) return;
    const data = await apiGet<{
      permissions: PermissionRow[];
      roleMatrix: RoleMatrixRow[];
    }>(`/schools/${schoolId}/access-control/overview`);
    setOverview(data);
  }

  async function loadUsers(role?: string) {
    if (!branchId) return;
    const query = role && role !== "all" ? `?role=${role}` : "";
    const data = await apiGet<{ data: BranchUser[] }>(
      `/branches/${branchId}/access-control/users${query}`,
    );
    setUsers(data.data);
  }

  async function loadSections() {
    if (!branchId || !scope?.sessionId) return;
    const classes = await apiGet<Array<{ id: number; name: string }>>(
      `/branches/${branchId}/sessions/${scope.sessionId}/classes`,
    );
    const options: SectionOption[] = [];
    for (const cls of classes ?? []) {
      const sectionsForClass = await apiGet<Array<{ id: number; name: string }>>(
        `/branches/${branchId}/sessions/${scope.sessionId}/classes/${cls.id}/sections`,
      );
      for (const section of sectionsForClass ?? []) {
        options.push({ id: section.id, label: `${cls.name} · Sec ${section.name}` });
      }
    }
    setSections(options);
  }

  useEffect(() => {
    if (!schoolId || !branchId) {
      setLoading(false);
      return;
    }
    Promise.all([loadOverview(), loadUsers(roleFilter), loadSections()])
      .catch((e) => toast({ title: "Failed to load access control", description: String(e), variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [schoolId, branchId, scope?.sessionId]);

  useEffect(() => {
    if (!branchId) return;
    loadUsers(roleFilter).catch((e) =>
      toast({ title: "Failed to load users", description: String(e), variant: "destructive" }),
    );
  }, [roleFilter, branchId]);

  if (!schoolId || !branchId) {
    return (
      <Layout>
        <p className="text-muted-foreground">Select a branch context to manage access control.</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="size-8 text-primary" />
            Access Control
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage people, roles, and section scope in one place. Role templates are inherited from the platform.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <Tabs defaultValue="people">
            <TabsList>
              <TabsTrigger value="people">People</TabsTrigger>
              <TabsTrigger value="matrix">Role permissions</TabsTrigger>
            </TabsList>

            <TabsContent value="people" className="space-y-4 mt-4">
              <div className="flex flex-wrap gap-2">
                {ROLE_TABS.map((tab) => (
                  <Button
                    key={tab.key}
                    size="sm"
                    variant={roleFilter === tab.key ? "default" : "outline"}
                    onClick={() => setRoleFilter(tab.key)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>

              <p className="text-sm text-muted-foreground">{users.length} shown</p>

              <div className="grid gap-3">
                {users.map((entry) => (
                  <UserAccessCard
                    key={entry.id}
                    user={entry}
                    branchId={branchId}
                    sections={sections}
                    onChanged={() => void loadUsers(roleFilter)}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="matrix" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Staff portal matrix (read-only)</CardTitle>
                  <CardDescription>
                    Platform-level role templates. Edit global templates from Platform → Access Control.
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 text-left font-medium">Permission</th>
                        {overview?.roleMatrix.map((role) => (
                          <th key={role.roleKey} className="py-2 px-2 text-center font-medium">
                            {role.roleName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {permissionsByModule.map(([module, permissions]) => (
                        <Fragment key={module}>
                          <tr className="bg-muted/40">
                            <td colSpan={(overview?.roleMatrix.length ?? 0) + 1} className="py-2 px-1 font-semibold capitalize">
                              {module}
                            </td>
                          </tr>
                          {permissions.map((permission) => (
                            <tr key={permission.key} className="border-b border-border/50">
                              <td className="py-2 pr-4">
                                <div>{permission.description ?? permission.key}</div>
                                <code className="text-xs text-muted-foreground">{permission.key}</code>
                              </td>
                              {overview?.roleMatrix.map((role) => (
                                <td key={`${role.roleKey}-${permission.key}`} className="text-center py-2">
                                  {role.permissions.includes(permission.key) ? "✓" : "—"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
}

function UserAccessCard({
  user,
  branchId,
  sections,
  onChanged,
}: {
  user: BranchUser;
  branchId: number;
  sections: SectionOption[];
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [selectedSections, setSelectedSections] = useState<number[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    apiGet<{ restrictions: Array<{ sectionId: number | null }> }>(
      `/branches/${branchId}/access-control/users/${user.id}/restrictions`,
    )
      .then((data) =>
        setSelectedSections(
          data.restrictions.map((r) => r.sectionId).filter((id): id is number => id != null),
        ),
      )
      .catch(() => setSelectedSections([]));
  }, [open, branchId, user.id]);

  async function saveRole(roleKey: string) {
    try {
      await apiSend(`/branches/${branchId}/access-control/users/${user.id}/role`, "PATCH", { roleKey });
      toast({ title: "Role updated" });
      onChanged();
    } catch (e) {
      toast({ title: "Failed to update role", description: String(e), variant: "destructive" });
    }
  }

  async function saveSections() {
    try {
      await apiSend(`/branches/${branchId}/access-control/users/${user.id}/restrictions`, "PUT", {
        sectionIds: selectedSections,
      });
      toast({ title: "Section access updated" });
      setOpen(false);
      onChanged();
    } catch (e) {
      toast({ title: "Failed to save sections", description: String(e), variant: "destructive" });
    }
  }

  return (
    <Card>
      <CardContent className="py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-semibold flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            {user.name}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {user.mobile} · {user.roleName}
            {user.userCode ? ` · ${user.userCode}` : ""}
          </div>
          <Badge variant="outline" className="mt-2">
            {user.restrictionCount} section scope rule(s)
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={user.roleKey} onValueChange={(value) => void saveRole(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              {["teacher", "coordinator", "accountant", "principal", "school_admin"].map((role) => (
                <SelectItem key={role} value={role}>
                  {role.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Sections</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Section scope for {user.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                {sections.map((section) => (
                  <label key={section.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedSections.includes(section.id)}
                      onCheckedChange={(checked) =>
                        setSelectedSections((prev) =>
                          checked ? [...prev, section.id] : prev.filter((id) => id !== section.id),
                        )
                      }
                    />
                    {section.label}
                  </label>
                ))}
              </div>
              <Button onClick={() => void saveSections()}>Save sections</Button>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
