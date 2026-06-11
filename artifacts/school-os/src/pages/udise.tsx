import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { useAuthStore } from "@/lib/auth";
import { apiGet, apiSend } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Snapshot = {
  id: number;
  academicYear: string;
  compliancePercentage: string;
  exportReadyStatus: string;
  createdAt: string;
};

export default function UdisePage() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId || 1;
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [academicYear, setAcademicYear] = useState("2025-26");

  const load = () =>
    apiGet<{ data: Snapshot[] }>(`/schools/${schoolId}/udise-snapshots`).then((r) => setSnapshots(r.data));

  useEffect(() => {
    load().catch(console.error);
  }, [schoolId]);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">UDISE Snapshot</h1>
          <p className="text-muted-foreground text-sm">Annual compliance snapshot and export readiness</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Generate Snapshot</CardTitle></CardHeader>
          <CardContent className="flex gap-3 items-end">
            <div className="space-y-1.5">
              <Label>Academic Year</Label>
              <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
            </div>
            <Button
              onClick={async () => {
                await apiSend(`/schools/${schoolId}/udise-snapshots`, "POST", { academicYear });
                await load();
              }}
            >
              Create / Refresh Snapshot
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Snapshots</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {snapshots.map((s) => (
              <div key={s.id} className="flex items-center justify-between border rounded-lg p-4">
                <div>
                  <p className="font-medium">{s.academicYear}</p>
                  <p className="text-sm text-muted-foreground">Compliance: {s.compliancePercentage}%</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={s.exportReadyStatus === "ready" ? "default" : "secondary"}>{s.exportReadyStatus}</Badge>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/api/schools/${schoolId}/udise-snapshots/${s.id}/export`} download>
                      Export JSON
                    </a>
                  </Button>
                </div>
              </div>
            ))}
            {snapshots.length === 0 && <p className="text-sm text-muted-foreground">No snapshots yet.</p>}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
