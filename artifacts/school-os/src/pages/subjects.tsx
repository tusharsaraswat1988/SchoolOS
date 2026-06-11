import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { apiGet, apiSend, apiDelete } from "@/lib/api";
import { useScope } from "@/lib/use-scope";
import { useListClasses, useListStaff } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TeacherAssignment = {
  id: number;
  subjectId: number;
  classId: number | null;
  subjectCode: string;
  subjectName: string;
  className: string | null;
};

export default function SubjectsPage() {
  const { branchId, sessionId, schoolId } = useScope();
  const { data: classes } = useListClasses(schoolId);
  const { data: staffData } = useListStaff(schoolId);
  const teachers = (staffData?.data ?? []).filter((s) => s.role === "teacher" || s.role === "principal");

  const [subjects, setSubjects] = useState<Array<{ id: number; code: string; name: string }>>([]);
  const [mapped, setMapped] = useState<Array<{ subjectName: string; subjectCode: string }>>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [mapClassId, setMapClassId] = useState("");
  const [mapSubjectId, setMapSubjectId] = useState("");
  const [teacherUserId, setTeacherUserId] = useState("");
  const [assignSubjectId, setAssignSubjectId] = useState("");
  const [assignClassId, setAssignClassId] = useState("");

  const base = `/branches/${branchId}/sessions/${sessionId}`;

  const load = () =>
    apiGet<{ data: typeof subjects }>(`${base}/subjects`).then((r) => setSubjects(r.data));

  const loadMapping = async (classId: string) => {
    if (!classId) return setMapped([]);
    const r = await apiGet<{ data: Array<{ subjectName: string; subjectCode: string }> }>(
      `${base}/classes/${classId}/subjects`,
    );
    setMapped(r.data.map((row) => ({ subjectName: row.subjectName, subjectCode: row.subjectCode })));
  };

  const loadTeacherAssignments = async (userId: string) => {
    if (!userId) return setAssignments([]);
    const r = await apiGet<{ data: TeacherAssignment[] }>(`/branches/${branchId}/users/${userId}/subjects`);
    setAssignments(r.data);
  };

  useEffect(() => {
    load().catch(console.error);
  }, [branchId, sessionId]);

  useEffect(() => {
    loadMapping(mapClassId).catch(console.error);
  }, [mapClassId, branchId, sessionId]);

  useEffect(() => {
    loadTeacherAssignments(teacherUserId).catch(console.error);
  }, [teacherUserId, branchId]);

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Subjects</h1>

        <Card>
          <CardHeader><CardTitle className="text-base">Add Subject</CardTitle></CardHeader>
          <CardContent>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await apiSend(`${base}/subjects`, "POST", { code, name });
                setCode("");
                setName("");
                await load();
              }}
              className="flex gap-3 flex-wrap items-end"
            >
              <div><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} required /></div>
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <Button type="submit">Add</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Subject Master ({subjects.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {subjects.map((s) => (
              <div key={s.id} className="flex justify-between border-b py-2 text-sm">
                <span className="font-medium">{s.name}</span>
                <span className="text-muted-foreground">{s.code}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Class-Subject Mapping</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await apiSend(`${base}/classes/${mapClassId}/subjects`, "POST", {
                  subjectId: Number(mapSubjectId),
                  isMandatory: true,
                });
                await loadMapping(mapClassId);
              }}
              className="flex gap-3 flex-wrap items-end"
            >
              <div>
                <Label>Class</Label>
                <Select value={mapClassId} onValueChange={setMapClassId}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{(classes ?? []).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject</Label>
                <Select value={mapSubjectId} onValueChange={setMapSubjectId}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="submit">Map Subject</Button>
            </form>
            {mapped.map((m, i) => (
              <div key={i} className="text-sm">{m.subjectName} ({m.subjectCode})</div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Teacher-Subject Assignment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await apiSend(`/branches/${branchId}/users/${teacherUserId}/subjects`, "POST", {
                  subjectId: Number(assignSubjectId),
                  classId: assignClassId && assignClassId !== "any" ? Number(assignClassId) : undefined,
                });
                setAssignSubjectId("");
                setAssignClassId("");
                await loadTeacherAssignments(teacherUserId);
              }}
              className="flex gap-3 flex-wrap items-end"
            >
              <div>
                <Label>Teacher</Label>
                <Select value={teacherUserId} onValueChange={setTeacherUserId}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.firstName} {t.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject</Label>
                <Select value={assignSubjectId} onValueChange={setAssignSubjectId}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Class (optional)</Label>
                <Select value={assignClassId} onValueChange={setAssignClassId}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any class</SelectItem>
                    {(classes ?? []).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={!teacherUserId || !assignSubjectId}>Assign</Button>
            </form>

            {teacherUserId && assignments.length === 0 && (
              <p className="text-sm text-muted-foreground">No subject assignments for this teacher.</p>
            )}
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between border-b py-2 text-sm">
                <span>
                  {a.subjectName} ({a.subjectCode})
                  {a.className ? ` — ${a.className}` : " — All classes"}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await apiDelete(`/branches/${branchId}/users/${teacherUserId}/subjects/${a.id}`);
                    await loadTeacherAssignments(teacherUserId);
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
