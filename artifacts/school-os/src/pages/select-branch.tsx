import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Branch = { id: number; code: string; name: string };
type Session = { id: number; name: string; isCurrent: boolean };

export default function SelectBranch() {
  const [, setLocation] = useLocation();
  const { user, setContext } = useAuthStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.schoolId) return;
    fetch(`/api/schools/${user.schoolId}/branches`)
      .then((r) => r.json())
      .then((res: { data: Branch[] }) => setBranches(res.data ?? []))
      .finally(() => setLoading(false));
  }, [user?.schoolId]);

  const selectBranch = async (branch: Branch) => {
    const sessionRes = await fetch(`/api/branches/${branch.id}/sessions/current`);
    let sessionId: number | null = null;
    if (sessionRes.ok) {
      const session = (await sessionRes.json()) as Session;
      sessionId = session.id;
    }
    setContext({
      societyId: user?.societyId,
      schoolId: user?.schoolId,
      branchId: branch.id,
      sessionId,
    });
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Select Branch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Loading branches…</p>}
          {!loading && branches.length === 0 && (
            <p className="text-sm text-muted-foreground">No branches found for this school.</p>
          )}
          {branches.map((b) => (
            <Button key={b.id} variant="outline" className="w-full justify-start h-12" onClick={() => void selectBranch(b)}>
              <span className="font-mono text-xs mr-2 opacity-60">{b.code}</span>
              {b.name}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
