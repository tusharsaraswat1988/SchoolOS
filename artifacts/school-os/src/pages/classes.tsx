import { useState } from "react";
import { Layout } from "@/components/layout";
import { useAuthStore } from "@/lib/auth";
import { useScope } from "@/lib/use-scope";
import { apiSend } from "@/lib/api";
import { useListClasses, useCreateClass, useListStaff, getListClassesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, GraduationCap, Users, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Classes() {
  const { user } = useAuthStore();
  const { branchId, sessionId } = useScope();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [teacherDialogClass, setTeacherDialogClass] = useState<{ id: number; name: string; teacherId?: number | null } | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const qc = useQueryClient();

  const { data: classes, isLoading } = useListClasses(branchId, sessionId, {
    query: { queryKey: branchId && sessionId ? getListClassesQueryKey(branchId, sessionId) : ["classes-disabled"] },
  });
  const { data: staffData } = useListStaff(branchId);
  const teachers = (staffData?.data ?? []).filter((s) => ["teacher", "principal"].includes(s.role));

  const createClass = useCreateClass({
    mutation: {
      onSuccess: () => {
        if (branchId && sessionId) {
          qc.invalidateQueries({ queryKey: getListClassesQueryKey(branchId, sessionId) });
        }
        setOpen(false);
        setForm({ name: "", section: "", grade: "", capacity: "" });
      },
    },
  });

  const [form, setForm] = useState({ name: "", section: "", grade: "", capacity: "" });
  const field = (key: keyof typeof form, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId || !sessionId) return;
    createClass.mutate({
      branchId,
      sessionId,
      data: {
        name: form.name,
        section: form.section || undefined,
        grade: form.grade ? Number(form.grade) : undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
      },
    });
  };

  const saveClassTeacher = async () => {
    if (!teacherDialogClass) return;
    try {
      await apiSend(
        `/branches/${branchId}/sessions/${sessionId}/classes/${teacherDialogClass.id}`,
        "PATCH",
        { classTeacherUserId: selectedTeacherId && selectedTeacherId !== "none" ? Number(selectedTeacherId) : null },
      );
      toast({ title: "Class teacher updated" });
      if (branchId && sessionId) {
        qc.invalidateQueries({ queryKey: getListClassesQueryKey(branchId, sessionId) });
      }
      setTeacherDialogClass(null);
    } catch (e) {
      toast({ title: "Update failed", description: String(e), variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Classes</h1>
            <p className="text-muted-foreground text-sm mt-1">{(classes ?? []).length} classes configured</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />Add Class</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Add New Class</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="grid gap-4 grid-cols-2 pt-2">
                <div className="space-y-1.5 col-span-2">
                  <Label>Class Name</Label>
                  <Input required value={form.name} onChange={(e) => field("name", e.target.value)} placeholder="Class 11" />
                </div>
                <div className="space-y-1.5">
                  <Label>Section</Label>
                  <Input value={form.section} onChange={(e) => field("section", e.target.value)} placeholder="A" />
                </div>
                <div className="space-y-1.5">
                  <Label>Grade</Label>
                  <Input type="number" value={form.grade} onChange={(e) => field("grade", e.target.value)} placeholder="11" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Capacity</Label>
                  <Input type="number" value={form.capacity} onChange={(e) => field("capacity", e.target.value)} placeholder="40" />
                </div>
                <div className="col-span-2 flex gap-3">
                  <Button type="submit" disabled={createClass.isPending}>{createClass.isPending ? "Saving..." : "Create Class"}</Button>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />)}
          </div>
        ) : (classes ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <GraduationCap className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No classes configured</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {(classes ?? []).map((c) => {
              const pct = c.capacity ? Math.round((Number(c.studentCount ?? 0) / c.capacity) * 100) : null;
              return (
                <Card key={c.id} className="hover:border-primary/50 transition-colors group">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <GraduationCap className="h-5 w-5 text-primary" />
                      </div>
                      {c.grade && <span className="text-xs text-muted-foreground font-medium">Grade {c.grade}</span>}
                    </div>
                    <div className="mt-2">
                      <p className="font-semibold text-base">{c.name}{c.section ? ` - ${c.section}` : ""}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.classTeacherName ?? "No teacher assigned"}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{c.studentCount ?? 0} students</span>
                      {c.capacity && <span className="text-muted-foreground/50">/ {c.capacity}</span>}
                    </div>
                    {pct !== null && (
                      <div>
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{pct}% full</p>
                      </div>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full gap-1"
                      onClick={() => {
                        setTeacherDialogClass({
                          id: c.id,
                          name: c.name,
                          teacherId: c.classTeacherUserId ?? c.classTeacherId,
                        });
                        setSelectedTeacherId(
                          c.classTeacherUserId ?? c.classTeacherId
                            ? String(c.classTeacherUserId ?? c.classTeacherId)
                            : "none",
                        );
                      }}
                    >
                      <UserCog className="h-3.5 w-3.5" />
                      Assign Class Teacher
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={teacherDialogClass != null} onOpenChange={(v) => !v && setTeacherDialogClass(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Class Teacher — {teacherDialogClass?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Teacher</Label>
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                  <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.firstName} {t.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveClassTeacher}>Save</Button>
                <Button variant="outline" onClick={() => setTeacherDialogClass(null)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
