import { Layout } from "@/components/layout";
import { useListSchools, getListSchoolsQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building, Users, UserSquare2 } from "lucide-react";

const PLAN_COLORS: Record<string, string> = {
  basic: "bg-zinc-500/15 text-zinc-600 border-zinc-500/20",
  standard: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  premium: "bg-violet-500/15 text-violet-600 border-violet-500/20",
  enterprise: "bg-amber-500/15 text-amber-600 border-amber-500/20",
};

export default function Schools() {
  const { data, isLoading } = useListSchools({}, {
    query: { queryKey: getListSchoolsQueryKey({}) },
  });

  const schools = data?.data ?? [];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Schools</h1>
          <p className="text-muted-foreground text-sm mt-1">{data?.total ?? 0} schools registered</p>
        </div>

        <div className="grid gap-4 grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Total Schools</p>
              <p className="text-2xl font-bold mt-1">{data?.total ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Total Students</p>
              <p className="text-2xl font-bold mt-1">{schools.reduce((sum, s) => sum + (s.studentCount ?? 0), 0).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Total Staff</p>
              <p className="text-2xl font-bold mt-1">{schools.reduce((sum, s) => sum + (s.staffCount ?? 0), 0)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-6">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted/50 rounded animate-pulse" />)}</div>
            ) : schools.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Building className="h-12 w-12 mb-3 opacity-30" />
                <p className="font-medium">No schools found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-muted/30">
                    <TableHead className="pl-6">School</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schools.map((s) => (
                    <TableRow key={s.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Building className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.email ?? "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{s.code}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.city && s.state ? `${s.city}, ${s.state}` : s.city ?? s.state ?? "—"}</TableCell>
                      <TableCell className="text-sm">{s.principalName ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {(s.studentCount ?? 0).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <UserSquare2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {s.staffCount ?? 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs capitalize ${PLAN_COLORS[s.subscriptionPlan ?? "basic"]}`}>
                          {s.subscriptionPlan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${s.status === "active" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" : ""}`}>
                          {s.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
