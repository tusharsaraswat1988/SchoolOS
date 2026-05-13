import { useState } from "react";
import { Layout } from "@/components/layout";
import { useAuthStore } from "@/lib/auth";
import { useListClasses, useCreateClass, getListClassesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, GraduationCap, Users } from "lucide-react";

export default function Classes() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId || 1;
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: classes, isLoading } = useListClasses(schoolId, {
    query: { queryKey: getListClassesQueryKey(schoolId) },
  });

  const createClass = useCreateClass({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListClassesQueryKey(schoolId) });
        setOpen(false);
        setForm({ name: "", section: "", grade: "", capacity: "" });
      },
    },
  });

  const [form, setForm] = useState({ name: "", section: "", grade: "", capacity: "" });
  const field = (key: keyof typeof form, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createClass.mutate({
      schoolId,
      data: {
        name: form.name,
        section: form.section || undefined,
        grade: form.grade ? Number(form.grade) : undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
      },
    });
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
                <Card key={c.id} className="hover:border-primary/50 transition-colors cursor-default group">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                        <GraduationCap className="h-5 w-5 text-primary" />
                      </div>
                      {c.grade && (
                        <span className="text-xs text-muted-foreground font-medium">Grade {c.grade}</span>
                      )}
                    </div>
                    <div className="mt-2">
                      <p className="font-semibold text-base">{c.name}{c.section ? ` - ${c.section}` : ""}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.classTeacherName ?? "No teacher assigned"}</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{c.studentCount ?? 0} students</span>
                      {c.capacity && <span className="text-muted-foreground/50">/ {c.capacity}</span>}
                    </div>
                    {pct !== null && (
                      <div className="mt-2">
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{pct}% full</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
