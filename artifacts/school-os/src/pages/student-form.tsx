import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useAuthStore } from "@/lib/auth";
import { useCreateStudent, useListClasses, getListStudentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

export default function StudentForm() {
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();
  const schoolId = user?.schoolId || 1;
  const qc = useQueryClient();

  const { data: classes } = useListClasses(schoolId);
  const createStudent = useCreateStudent({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListStudentsQueryKey(schoolId) });
        setLocation("/students");
      },
    },
  });

  const [form, setForm] = useState({
    firstName: "", lastName: "", gender: "male",
    dateOfBirth: "", classId: "", fatherName: "",
    motherName: "", parentPhone: "", parentEmail: "",
    bloodGroup: "", admissionNumber: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createStudent.mutate({
      schoolId,
      data: {
        ...form,
        classId: Number(form.classId),
        gender: form.gender as any,
        admissionNumber: form.admissionNumber || `ADM-${Date.now()}`,
      },
    });
  };

  const field = (key: keyof typeof form, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/students")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Add Student</h1>
            <p className="text-muted-foreground text-sm">Enrol a new student to the school</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
            <CardContent className="grid gap-4 grid-cols-2">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input required value={form.firstName} onChange={(e) => field("firstName", e.target.value)} placeholder="Aarav" />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input required value={form.lastName} onChange={(e) => field("lastName", e.target.value)} placeholder="Sharma" />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => field("gender", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date of Birth</Label>
                <Input type="date" value={form.dateOfBirth} onChange={(e) => field("dateOfBirth", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Blood Group</Label>
                <Input value={form.bloodGroup} onChange={(e) => field("bloodGroup", e.target.value)} placeholder="O+" />
              </div>
              <div className="space-y-1.5">
                <Label>Admission Number</Label>
                <Input value={form.admissionNumber} onChange={(e) => field("admissionNumber", e.target.value)} placeholder="Auto-generated if empty" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Academic Details</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <Label>Class</Label>
                <Select required value={form.classId} onValueChange={(v) => field("classId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {(classes ?? []).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}{c.section ? ` - ${c.section}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Parent / Guardian</CardTitle></CardHeader>
            <CardContent className="grid gap-4 grid-cols-2">
              <div className="space-y-1.5">
                <Label>Father's Name</Label>
                <Input value={form.fatherName} onChange={(e) => field("fatherName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Mother's Name</Label>
                <Input value={form.motherName} onChange={(e) => field("motherName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Parent Phone</Label>
                <Input value={form.parentPhone} onChange={(e) => field("parentPhone", e.target.value)} placeholder="+91-9876543210" />
              </div>
              <div className="space-y-1.5">
                <Label>Parent Email</Label>
                <Input type="email" value={form.parentEmail} onChange={(e) => field("parentEmail", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={createStudent.isPending}>
              {createStudent.isPending ? "Saving..." : "Add Student"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setLocation("/students")}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
