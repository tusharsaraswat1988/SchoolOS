import { useCallback, useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { useScope } from "@/lib/use-scope";
import { useAuthStore } from "@/lib/auth";
import { apiGet, apiSend } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

type Branch = { id: number; code: string; name: string };

type SessionRow = {
  id: number;
  code: string;
  name: string;
  startsOn: string;
  endsOn: string;
  isCurrent: boolean;
  status: string;
};

type SessionKind = "academic" | "financial";

const EMPTY_FORM = { code: "", name: "", startsOn: "", endsOn: "" };

function sessionPaths(kind: SessionKind, branchId: number) {
  if (kind === "academic") {
    return {
      list: `/branches/${branchId}/sessions`,
      create: `/branches/${branchId}/sessions`,
      setCurrent: (id: number) => `/branches/${branchId}/sessions/${id}/set-current`,
    };
  }
  return {
    list: `/branches/${branchId}/financial-sessions`,
    create: `/branches/${branchId}/financial-sessions`,
    setCurrent: (id: number) => `/branches/${branchId}/financial-sessions/${id}/set-current`,
  };
}

function SessionPanel({
  kind,
  branchId,
  title,
  description,
}: {
  kind: SessionKind;
  branchId: number;
  title: string;
  description: string;
}) {
  const { toast } = useToast();
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const paths = sessionPaths(kind, branchId);
      const res = await apiGet<{ data: SessionRow[] }>(paths.list);
      setRows(res.data ?? []);
    } catch (e) {
      toast({ title: `Failed to load ${title}`, description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [branchId, kind, title, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const paths = sessionPaths(kind, branchId);
      await apiSend(paths.create, "POST", { ...form, isCurrent: rows.length === 0 });
      setForm(EMPTY_FORM);
      toast({ title: `${title} created` });
      await load();
    } catch (err) {
      toast({ title: "Create failed", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const setCurrent = async (id: number) => {
    try {
      const paths = sessionPaths(kind, branchId);
      await apiSend(paths.setCurrent(id), "POST");
      toast({ title: "Current session updated" });
      await load();
    } catch (err) {
      toast({ title: "Update failed", description: String(err), variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions yet. Create the first one below.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{row.code}</span>
                    {row.isCurrent && <Badge variant="secondary">Current</Badge>}
                    {row.status !== "active" && <Badge variant="outline">{row.status}</Badge>}
                  </div>
                  <p className="text-muted-foreground">{row.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {row.startsOn} → {row.endsOn}
                  </p>
                </div>
                {!row.isCurrent && row.status === "active" && (
                  <Button size="sm" variant="outline" onClick={() => void setCurrent(row.id)}>
                    Set as current
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={(e) => void handleCreate(e)} className="grid gap-3 md:grid-cols-2 border-t pt-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Add new session</Label>
          </div>
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input
              placeholder={kind === "academic" ? "2026-27" : "FY-2026-27"}
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              placeholder={kind === "academic" ? "Academic Session 2026-27" : "Financial Year 2026-27"}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Starts on</Label>
            <Input
              type="date"
              value={form.startsOn}
              onChange={(e) => setForm((f) => ({ ...f, startsOn: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Ends on</Label>
            <Input
              type="date"
              value={form.endsOn}
              onChange={(e) => setForm((f) => ({ ...f, endsOn: e.target.value }))}
              required
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create session"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function SessionsPage() {
  const scope = useScope();
  const { user } = useAuthStore();
  const schoolId = scope.schoolId ?? user?.schoolId ?? null;
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<number | null>(scope.branchId);
  const { toast } = useToast();

  useEffect(() => {
    if (scope.branchId) {
      setBranchId(scope.branchId);
      return;
    }
    if (!schoolId) return;
    apiGet<{ data: Branch[] }>(`/schools/${schoolId}/branches`)
      .then((res) => setBranches(res.data ?? []))
      .catch((e) => toast({ title: "Failed to load branches", description: String(e), variant: "destructive" }));
  }, [scope.branchId, schoolId, toast]);

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold">Session Management</h1>
          <p className="text-muted-foreground text-sm">
            Configure academic year and financial year sessions per branch.
          </p>
        </div>

        {!branchId && branches.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select branch</CardTitle>
            </CardHeader>
            <CardContent>
              <Select onValueChange={(v) => setBranchId(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.code} — {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {!branchId && branches.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Select a branch from the branch picker, or ensure your school has branches configured.
          </p>
        )}

        {branchId != null && (
          <>
            <SessionPanel
              kind="academic"
              branchId={branchId}
              title="Academic Year Session"
              description="Used for classes, attendance, examinations, and student enrollment."
            />
            <SessionPanel
              kind="financial"
              branchId={branchId}
              title="Financial Year Session"
              description="Used for fee structures, receipts, and accounts year-end closing."
            />
          </>
        )}
      </div>
    </Layout>
  );
}
