import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getCurrentSession, useListSchoolBranches } from "@workspace/api-client-react";
import { apiGet } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Branch = { id: number; code: string; name: string };

export default function SelectBranch() {
  const [, setLocation] = useLocation();
  const { user, setContext } = useAuthStore();
  const [selectingId, setSelectingId] = useState<number | null>(null);
  const [selectError, setSelectError] = useState("");

  const schoolId = user?.schoolId ?? 0;
  const { data, isLoading, isError } = useListSchoolBranches(schoolId, {
    query: { enabled: schoolId > 0 },
  });

  const branches = (data?.data ?? []) as Branch[];

  const selectBranch = useCallback(
    async (branch: Branch) => {
      setSelectError("");
      setSelectingId(branch.id);
      try {
        let sessionId: number | null = null;
        let financialSessionId: number | null = null;
        try {
          const session = await getCurrentSession(branch.id);
          sessionId = session.id;
        } catch {
          setSelectError("No active academic session found for this branch. Contact your administrator.");
          setSelectingId(null);
          return;
        }

        try {
          const financialSession = await apiGet<{ id: number }>(
            `/branches/${branch.id}/financial-sessions/current`,
          );
          financialSessionId = financialSession.id;
        } catch {
          /* financial session is optional until configured */
        }

        setContext({
          societyId: user?.societyId,
          schoolId: user?.schoolId,
          branchId: branch.id,
          sessionId,
          financialSessionId,
        });
        setLocation("/dashboard");
      } catch {
        setSelectError("Could not select branch. Please try again.");
        setSelectingId(null);
      }
    },
    [setContext, setLocation, user?.schoolId, user?.societyId],
  );

  useEffect(() => {
    if (branches.length === 1 && selectingId == null) {
      void selectBranch(branches[0]);
    }
  }, [branches, selectBranch, selectingId]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Select Branch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!schoolId && (
            <p className="text-sm text-destructive">Your account is not linked to a school.</p>
          )}
          {schoolId > 0 && isLoading && (
            <p className="text-sm text-muted-foreground">Loading branches…</p>
          )}
          {schoolId > 0 && isError && (
            <p className="text-sm text-destructive">Could not load branches. Please refresh and try again.</p>
          )}
          {schoolId > 0 && !isLoading && !isError && branches.length === 0 && (
            <p className="text-sm text-muted-foreground">No branches found for this school.</p>
          )}
          {selectError && <p className="text-sm text-destructive">{selectError}</p>}
          {branches.map((b) => (
            <Button
              key={b.id}
              variant="outline"
              className="w-full justify-start h-12"
              disabled={selectingId != null}
              onClick={() => void selectBranch(b)}
            >
              <span className="font-mono text-xs mr-2 opacity-60">{b.code}</span>
              {b.name}
              {selectingId === b.id && <span className="ml-auto text-xs opacity-60">Selecting…</span>}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
