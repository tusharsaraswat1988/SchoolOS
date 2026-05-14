import { useState } from "react";
import { Layout } from "@/components/layout";
import { useAuthStore } from "@/lib/auth";
import {
  useListClasses, useListStudents, useMarkAttendance, useGetAttendanceSummary,
  getListAttendanceQueryKey, getGetAttendanceSummaryQueryKey, getListStudentsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, CheckCircle2, XCircle, Clock, MinusCircle } from "lucide-react";

type AttStatus = "present" | "absent" | "late" | "excused";

const STATUS_CONFIG: Record<AttStatus, { label: string; color: string; icon: React.ElementType }> = {
  present: { label: "Present", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
  absent: { label: "Absent", color: "bg-red-500/15 text-red-600 border-red-500/20", icon: XCircle },
  late: { label: "Late", color: "bg-amber-500/15 text-amber-600 border-amber-500/20", icon: Clock },
  excused: { label: "Excused", color: "bg-blue-500/15 text-blue-600 border-blue-500/20", icon: MinusCircle },
};

export default function Attendance() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId || 1;
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [studentStatuses, setStudentStatuses] = useState<Record<number, AttStatus>>({});
  const [saved, setSaved] = useState(false);
  const qc = useQueryClient();

  const { data: classes } = useListClasses(schoolId);
  const { data: studentsData } = useListStudents(
    schoolId,
    { classId: selectedClassId ? Number(selectedClassId) : undefined },
    { query: { enabled: !!selectedClassId, queryKey: getListStudentsQueryKey(schoolId, { classId: selectedClassId ? Number(selectedClassId) : undefined }) } }
  );
  const { data: summary } = useGetAttendanceSummary(schoolId, {}, {
    query: { queryKey: getGetAttendanceSummaryQueryKey(schoolId, {}) },
  });

  const markAttendance = useMarkAttendance({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListAttendanceQueryKey(schoolId) });
        qc.invalidateQueries({ queryKey: getGetAttendanceSummaryQueryKey(schoolId) });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      },
    },
  });

  const students = studentsData?.data ?? [];

  const handleSave = () => {
    if (!selectedClassId) return;
    markAttendance.mutate({
      schoolId,
      data: {
        date: selectedDate,
        classId: Number(selectedClassId),
        records: students.map((s) => ({
          studentId: s.id,
          status: studentStatuses[s.id] ?? "present",
        })),
      },
    });
  };

  const summaryStats = [
    { label: "Present Today", value: summary?.presentToday ?? 0, color: "text-emerald-600" },
    { label: "Absent Today", value: summary?.absentToday ?? 0, color: "text-red-600" },
    { label: "Late", value: summary?.lateToday ?? 0, color: "text-amber-600" },
    { label: "Attendance Rate", value: `${summary?.avgAttendanceRate ?? 0}%`, color: "text-primary" },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground text-sm mt-1">Mark and track daily attendance</p>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {summaryStats.map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mark Attendance</CardTitle>
            <div className="flex gap-3 mt-2 flex-wrap">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                max={today}
              />
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {(classes ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}{c.section ? ` - ${c.section}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!selectedClassId ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <CalendarCheck className="h-12 w-12 mb-3 opacity-30" />
                <p className="font-medium">Select a class to mark attendance</p>
              </div>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p>No students in this class</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 px-6 py-3 border-b bg-muted/20">
                  <span className="text-sm text-muted-foreground">Quick mark all:</span>
                  {(["present", "absent"] as AttStatus[]).map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs capitalize"
                      onClick={() => setStudentStatuses(Object.fromEntries(students.map((st) => [st.id, s])))}
                    >
                      All {s}
                    </Button>
                  ))}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-muted/30">
                      <TableHead className="pl-6">Student</TableHead>
                      <TableHead>Roll No.</TableHead>
                      {(["present", "absent", "late", "excused"] as AttStatus[]).map((s) => (
                        <TableHead key={s} className="text-center w-24">
                          <Badge variant="outline" className={`text-xs ${STATUS_CONFIG[s].color}`}>{STATUS_CONFIG[s].label}</Badge>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s) => {
                      const current = studentStatuses[s.id] ?? "present";
                      return (
                        <TableRow key={s.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                {s.firstName.charAt(0)}{s.lastName.charAt(0)}
                              </div>
                              <span className="font-medium text-sm">{s.firstName} {s.lastName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{s.rollNumber ?? "—"}</TableCell>
                          {(["present", "absent", "late", "excused"] as AttStatus[]).map((status) => (
                            <TableCell key={status} className="text-center">
                              <button
                                onClick={() => setStudentStatuses((prev) => ({ ...prev, [s.id]: status }))}
                                className={`w-6 h-6 rounded-full border-2 mx-auto transition-all ${
                                  current === status
                                    ? status === "present" ? "bg-emerald-500 border-emerald-500"
                                    : status === "absent" ? "bg-red-500 border-red-500"
                                    : status === "late" ? "bg-amber-500 border-amber-500"
                                    : "bg-blue-500 border-blue-500"
                                    : "border-muted-foreground/30 hover:border-muted-foreground/60"
                                }`}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="p-4 border-t flex items-center gap-3">
                  <Button onClick={handleSave} disabled={markAttendance.isPending}>
                    {markAttendance.isPending ? "Saving..." : "Save Attendance"}
                  </Button>
                  {saved && <span className="text-sm text-emerald-600 font-medium">Attendance saved!</span>}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
