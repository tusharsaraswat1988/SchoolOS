import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { useOperationalScope } from "@/lib/use-scope";
import { apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileWarning, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

type DashboardRow = {
  studentId: number;
  fullName: string;
  admissionNumber: string;
  registrationNumber?: string | null;
  className?: string | null;
  sectionName?: string | null;
  missingMandatory: number;
  expired: number;
  pendingVerification: number;
  rejected: number;
  completionPercent: number;
  status: string;
};

type DashboardResponse = {
  data: DashboardRow[];
  summary: {
    totalStudents: number;
    fullyComplete: number;
    withMissing: number;
    withExpired: number;
    withPending: number;
    withRejected: number;
  };
};

const STATUS_BADGE: Record<string, string> = {
  complete: "bg-emerald-500/15 text-emerald-600",
  missing: "bg-red-500/15 text-red-600",
  expired: "bg-amber-500/15 text-amber-600",
  pending: "bg-blue-500/15 text-blue-600",
  rejected: "bg-red-500/15 text-red-600",
};

export default function StudentDocumentsDashboard() {
  const scope = useOperationalScope();
  const [filter, setFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["student-doc-dashboard", scope?.branchId, scope?.sessionId, filter],
    queryFn: () =>
      apiGet<DashboardResponse>(
        `/branches/${scope!.branchId}/sessions/${scope!.sessionId}/students/document-dashboard${
          filter !== "all" ? `?filter=${filter}` : ""
        }`,
      ),
    enabled: !!scope,
  });

  if (!scope) {
    return (
      <Layout>
        <p className="text-muted-foreground">Select a branch and session.</p>
      </Layout>
    );
  }

  const rows = data?.data ?? [];
  const summary = data?.summary;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Document Dashboard</h1>
            <p className="text-muted-foreground text-sm">Student document completion across the session</p>
          </div>
          <Link href="/document-master">
            <Button variant="outline">Document Master</Button>
          </Link>
        </div>

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{summary.totalStudents}</p><p className="text-xs text-muted-foreground">Students</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{summary.fullyComplete}</p><p className="text-xs text-muted-foreground">Complete</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-500">{summary.withMissing}</p><p className="text-xs text-muted-foreground">Missing Docs</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{summary.withExpired}</p><p className="text-xs text-muted-foreground">Expired</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{summary.withPending}</p><p className="text-xs text-muted-foreground">Pending Verify</p></CardContent></Card>
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileWarning className="h-4 w-4" /> Students
            </CardTitle>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="missing">Missing Documents</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="pending">Pending Verification</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="incomplete">Incomplete</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-6 text-sm text-muted-foreground">Loading...</p>
            ) : rows.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No students match this filter.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead>Issues</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-6 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.studentId}>
                      <TableCell className="pl-6">
                        <div className="font-medium">{r.fullName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{r.admissionNumber}</div>
                      </TableCell>
                      <TableCell>{r.className ?? "—"}{r.sectionName ? ` · ${r.sectionName}` : ""}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${r.completionPercent >= 100 ? "bg-emerald-500" : r.completionPercent >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                              style={{ width: `${r.completionPercent}%` }}
                            />
                          </div>
                          <span className="text-sm">{r.completionPercent}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.missingMandatory > 0 && <span className="mr-2">{r.missingMandatory} missing</span>}
                        {r.expired > 0 && <span className="mr-2">{r.expired} expired</span>}
                        {r.pendingVerification > 0 && <span>{r.pendingVerification} pending</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize ${STATUS_BADGE[r.status] ?? ""}`}>
                          {r.status === "complete" && <CheckCircle2 className="h-3 w-3 mr-1 inline" />}
                          {r.status === "pending" && <Clock className="h-3 w-3 mr-1 inline" />}
                          {r.status === "expired" && <AlertTriangle className="h-3 w-3 mr-1 inline" />}
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <Link href={`/students/${r.studentId}/edit?tab=documents`}>
                          <Button size="sm" variant="outline">Manage</Button>
                        </Link>
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
