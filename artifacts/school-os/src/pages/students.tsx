import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { useScope } from "@/lib/use-scope";
import { useListStudents, useDeleteStudent, getListStudentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, UserCircle, Pencil, Trash2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  inactive: "bg-zinc-500/15 text-zinc-500 border-zinc-500/20",
  graduated: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  transferred: "bg-amber-500/15 text-amber-600 border-amber-500/20",
};

export default function Students() {
  const { branchId, sessionId } = useScope();
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useListStudents(branchId, sessionId, { search: search || undefined }, {
    query: { queryKey: branchId && sessionId ? getListStudentsQueryKey(branchId, sessionId, { search: search || undefined }) : ["students-disabled"] },
  });

  const deleteStudent = useDeleteStudent({
    mutation: {
      onSuccess: () => {
        if (branchId && sessionId) {
          qc.invalidateQueries({ queryKey: getListStudentsQueryKey(branchId, sessionId) });
        }
      },
    },
  });

  const students = data?.data ?? [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Students</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {data?.total ?? 0} students enrolled
            </p>
          </div>
          <Link href="/students/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Student
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
                ))}
              </div>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <UserCircle className="h-12 w-12 mb-3 opacity-30" />
                <p className="font-medium">No students found</p>
                <p className="text-sm">Try adjusting your search or add a new student.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-muted/30">
                    <TableHead className="pl-6">Student</TableHead>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Parent Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {s.firstName.charAt(0)}{s.lastName.charAt(0)}
                          </div>
                          <div>
                            <Link href={`/students/${s.id}`}>
                              <span className="font-medium hover:text-primary cursor-pointer">
                                {s.firstName} {s.lastName}
                              </span>
                            </Link>
                            <div className="text-xs text-muted-foreground">{s.fatherName}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{s.admissionNumber}</TableCell>
                      <TableCell>{s.className ?? "—"}</TableCell>
                      <TableCell className="capitalize">{s.gender}</TableCell>
                      <TableCell className="text-muted-foreground">{s.parentPhone ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs capitalize ${STATUS_COLORS[s.status ?? "active"]}`}>
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/students/${s.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => branchId && sessionId && deleteStudent.mutate({ branchId, sessionId, studentId: s.id })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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
