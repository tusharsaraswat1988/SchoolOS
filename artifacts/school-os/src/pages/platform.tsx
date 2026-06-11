import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, GraduationCap, School, Users } from "lucide-react";

type PlatformStats = {
  totalSocieties: number;
  totalSchools: number;
  totalStudents: number;
  totalTeachers: number;
  activeSessions: number;
  totalBranches: number;
  totalUsers: number;
};

export default function PlatformDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/platform/dashboard")
      .then((r) => r.json())
      .then((data: PlatformStats) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const items = stats
    ? [
        { label: "Total Societies", value: stats.totalSocieties, icon: Building },
        { label: "Total Schools", value: stats.totalSchools, icon: School },
        { label: "Total Students", value: stats.totalStudents, icon: GraduationCap },
        { label: "Total Teachers", value: stats.totalTeachers, icon: Users },
        { label: "Active Sessions", value: stats.activeSessions, icon: GraduationCap },
        { label: "Total Branches", value: stats.totalBranches, icon: Building },
      ]
    : [];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>
          <p className="text-muted-foreground mt-1">System-wide statistics across all tenants</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <Card key={item.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <span className="text-3xl font-bold">{item.value.toLocaleString()}</span>
                  <item.icon className="w-5 h-5 text-primary opacity-70" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/societies" className="text-sm text-primary underline-offset-4 hover:underline">
            Manage Societies →
          </Link>
          <Link href="/schools" className="text-sm text-primary underline-offset-4 hover:underline">
            All Schools →
          </Link>
        </div>
      </div>
    </Layout>
  );
}
