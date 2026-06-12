import { Link } from "wouter";
import { useGetPlatformDashboard } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { PLATFORM_NAV_SECTIONS } from "@/lib/platform-navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const { data, isLoading, isError } = useGetPlatformDashboard({
    query: {
      select: (response) => response as unknown as PlatformStats,
    },
  });

  const items = data
    ? [
        { label: "Total Societies", value: data.totalSocieties, icon: Building },
        { label: "Total Schools", value: data.totalSchools, icon: School },
        { label: "Total Students", value: data.totalStudents, icon: GraduationCap },
        { label: "Total Teachers", value: data.totalTeachers, icon: Users },
        { label: "Active Sessions", value: data.activeSessions, icon: GraduationCap },
        { label: "Total Branches", value: data.totalBranches, icon: Building },
      ]
    : [];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Combined overview across all societies and schools. Richer cross-tenant analytics will come later.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">Could not load platform statistics. Please try again.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {items.map((item) => (
              <Card key={item.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <span className="text-3xl font-bold">{(item.value ?? 0).toLocaleString()}</span>
                  <item.icon className="size-5 text-primary opacity-70" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {PLATFORM_NAV_SECTIONS.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle className="text-lg">{section.label}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {section.items.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="block text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {item.label} →
                  </Link>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
