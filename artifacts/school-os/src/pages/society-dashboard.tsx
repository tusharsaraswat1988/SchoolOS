import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Layout } from "@/components/layout";
import { useAuthStore } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SocietyDashboard = {
  totalSchools: number;
  activeSchools: number;
  totalBranches: number;
  totalStudents: number;
};

export default function SocietyDashboardPage() {
  const [, params] = useRoute("/societies/:societyId");
  const societyId = Number(params?.societyId);
  const { user } = useAuthStore();
  const [data, setData] = useState<SocietyDashboard | null>(null);

  useEffect(() => {
    if (!societyId) return;
    fetch(`/api/societies/${societyId}/dashboard`)
      .then((r) => r.json())
      .then(setData);
  }, [societyId]);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Society Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {user?.name} · Society #{societyId}
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ["Schools", data?.totalSchools],
            ["Active Schools", data?.activeSchools],
            ["Branches", data?.totalBranches],
            ["Students", data?.totalStudents],
          ].map(([label, value]) => (
            <Card key={label as string}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{label as string}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{(value ?? "—").toLocaleString?.() ?? value ?? "—"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
