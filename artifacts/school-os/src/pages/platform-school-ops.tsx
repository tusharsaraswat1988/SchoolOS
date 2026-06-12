import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  getCurrentSession,
  getGetSchoolQueryKey,
  getListSchoolBranchesQueryKey,
  useGetSchool,
  useListSchoolBranches,
  useListSchools,
  getListSchoolsQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { apiGet } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { useScope } from "@/lib/use-scope";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, MapPin, Wrench } from "lucide-react";

type Branch = { id: number; code: string; name: string };

export default function PlatformSchoolOps() {
  const [, setLocation] = useLocation();
  const { setContext } = useAuthStore();
  const scope = useScope();
  const [pendingSchoolId, setPendingSchoolId] = useState<number | null>(scope.schoolId);
  const [selectingBranchId, setSelectingBranchId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const { data: schoolsData, isLoading: schoolsLoading } = useListSchools({}, {
    query: { queryKey: getListSchoolsQueryKey({}) },
  });

  const activeSchoolId = pendingSchoolId ?? scope.schoolId;
  const { data: school } = useGetSchool(activeSchoolId ?? 0, {
    query: {
      enabled: (activeSchoolId ?? 0) > 0,
      queryKey: getGetSchoolQueryKey(activeSchoolId ?? 0),
    },
  });

  const { data: branchesData, isLoading: branchesLoading } = useListSchoolBranches(activeSchoolId ?? 0, {
    query: {
      enabled: (activeSchoolId ?? 0) > 0,
      queryKey: getListSchoolBranchesQueryKey(activeSchoolId ?? 0),
    },
  });

  const branches = (branchesData?.data ?? []) as Branch[];
  const schools = schoolsData?.data ?? [];
  const inSupportMode = scope.schoolId != null && scope.branchId != null && scope.sessionId != null;

  const enterBranch = useCallback(
    async (branch: Branch, schoolId: number, societyId: number | null | undefined) => {
      setError("");
      setSelectingBranchId(branch.id);
      try {
        const session = await getCurrentSession(branch.id);
        let financialSessionId: number | null = null;
        try {
          const financialSession = await apiGet<{ id: number }>(
            `/branches/${branch.id}/financial-sessions/current`,
          );
          financialSessionId = financialSession.id;
        } catch {
          /* optional */
        }

        setContext({
          societyId: societyId ?? null,
          schoolId,
          branchId: branch.id,
          sessionId: session.id,
          financialSessionId,
        });
        setPendingSchoolId(null);
        setSelectingBranchId(null);
      } catch {
        setError("No active academic session for this branch. Set up sessions first.");
        setSelectingBranchId(null);
      }
    },
    [setContext],
  );

  useEffect(() => {
    if (branches.length === 1 && activeSchoolId && !inSupportMode && selectingBranchId == null) {
      const selectedSchool = schools.find((s) => s.id === activeSchoolId);
      void enterBranch(branches[0], activeSchoolId, selectedSchool?.societyId);
    }
  }, [activeSchoolId, branches, enterBranch, inSupportMode, schools, selectingBranchId]);

  const exitSupportMode = () => {
    setContext(null);
    setPendingSchoolId(null);
    setError("");
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">School Support</h1>
            <p className="mt-1 text-muted-foreground">
              Pick a school and branch to inspect, edit, add, or delete its data when something is wrong.
            </p>
          </div>
          {inSupportMode && (
            <Button variant="outline" onClick={exitSupportMode}>
              Exit support mode
            </Button>
          )}
        </div>

        {inSupportMode && school && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wrench className="size-5 text-primary" />
                Active support context
              </CardTitle>
              <CardDescription>
                Use the School Support links in the sidebar to open modules for this tenant.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge variant="secondary">{school.name} · {school.code}</Badge>
              {scope.branchId && (
                <Badge variant="outline">Branch #{scope.branchId}</Badge>
              )}
              <Link href="/sessions" className="text-sm text-primary underline-offset-4 hover:underline">
                Open sessions →
              </Link>
              <Link href="/students" className="text-sm text-primary underline-offset-4 hover:underline">
                Open students →
              </Link>
            </CardContent>
          </Card>
        )}

        {!inSupportMode && !activeSchoolId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Step 1 — Choose a school</CardTitle>
              <CardDescription>Select the school that needs support.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {schoolsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded bg-muted/50" />
                  ))}
                </div>
              ) : schools.length === 0 ? (
                <p className="text-sm text-muted-foreground">No schools registered yet.</p>
              ) : (
                schools.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setPendingSchoolId(s.id)}
                    className="flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <Building className="size-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-sm text-muted-foreground">{s.code}</p>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {!inSupportMode && activeSchoolId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Step 2 — Choose a branch</CardTitle>
              <CardDescription>
                {school ? `${school.name} · ${school.code}` : `School #${activeSchoolId}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="ghost" size="sm" onClick={() => setPendingSchoolId(null)}>
                ← Back to schools
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {branchesLoading ? (
                <div className="h-14 animate-pulse rounded bg-muted/50" />
              ) : branches.length === 0 ? (
                <p className="text-sm text-muted-foreground">This school has no branches yet.</p>
              ) : (
                branches.map((branch) => (
                  <button
                    key={branch.id}
                    type="button"
                    disabled={selectingBranchId != null}
                    onClick={() => {
                      const selectedSchool = schools.find((s) => s.id === activeSchoolId);
                      void enterBranch(branch, activeSchoolId, selectedSchool?.societyId);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/40 disabled:opacity-60"
                  >
                    <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                      <MapPin className="size-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{branch.name}</p>
                      <p className="text-sm text-muted-foreground">{branch.code}</p>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
