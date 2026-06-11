import { useEffect, useState } from "react";

import { useLocation, useParams } from "wouter";

import { Layout } from "@/components/layout";

import { useAuthStore } from "@/lib/auth";

import {

  useCreateStudent,

  useGetStudent,

  useListClasses,

  useUpdateStudent,

  getListStudentsQueryKey,

  getGetStudentQueryKey,

} from "@workspace/api-client-react";

import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { ArrowLeft } from "lucide-react";



const emptyForm = {

  firstName: "", lastName: "", gender: "male",

  dateOfBirth: "", classId: "", rollNumber: "",

  fatherName: "", motherName: "", guardianName: "",

  parentPhone: "", parentEmail: "",

  bloodGroup: "", admissionNumber: "", address: "",

  socialCategory: "general", religion: "", aadhaar: "",

  admissionDate: "", transportAssigned: false,

};



export default function StudentForm() {

  const params = useParams<{ id?: string }>();

  const editId = params.id ? Number(params.id) : null;

  const isEdit = editId != null && !Number.isNaN(editId);

  const [, setLocation] = useLocation();

  const { user } = useAuthStore();

  const schoolId = user?.schoolId || 1;

  const qc = useQueryClient();



  const { data: existing } = useGetStudent(schoolId, editId ?? 0, {

    query: { enabled: isEdit, queryKey: getGetStudentQueryKey(schoolId, editId ?? 0) },

  });



  const { data: classes } = useListClasses(schoolId);

  const [form, setForm] = useState(emptyForm);



  useEffect(() => {

    if (!existing || !isEdit) return;

    setForm({

      firstName: existing.firstName ?? "",

      lastName: existing.lastName ?? "",

      gender: existing.gender ?? "male",

      dateOfBirth: existing.dateOfBirth ? String(existing.dateOfBirth).slice(0, 10) : "",

      classId: String(existing.classId ?? ""),

      rollNumber: existing.rollNumber ?? "",

      fatherName: existing.fatherName ?? "",

      motherName: existing.motherName ?? "",

      guardianName: "",

      parentPhone: existing.parentPhone ?? "",

      parentEmail: existing.parentEmail ?? "",

      bloodGroup: existing.bloodGroup ?? "",

      admissionNumber: existing.admissionNumber ?? "",

      address: existing.address ?? "",

      socialCategory: existing.category ?? "general",

      religion: "",

      aadhaar: "",

      admissionDate: "",

      transportAssigned: false,

    });

  }, [existing, isEdit]);



  const createStudent = useCreateStudent({

    mutation: {

      onSuccess: () => {

        qc.invalidateQueries({ queryKey: getListStudentsQueryKey(schoolId) });

        setLocation("/students");

      },

    },

  });



  const updateStudent = useUpdateStudent({

    mutation: {

      onSuccess: () => {

        qc.invalidateQueries({ queryKey: getListStudentsQueryKey(schoolId) });

        qc.invalidateQueries({ queryKey: getGetStudentQueryKey(schoolId, editId!) });

        setLocation(`/students/${editId}`);

      },

    },

  });



  const handleSubmit = (e: React.FormEvent) => {

    e.preventDefault();

    const payload = {

      ...form,

      classId: Number(form.classId),

      gender: form.gender as "male" | "female" | "other",

      socialCategory: form.socialCategory as "general" | "sc" | "st" | "obc" | "other",

      admissionNumber: form.admissionNumber || `ADM-${Date.now()}`,

    };

    if (isEdit && editId) {

      updateStudent.mutate({ branchId: 1, sessionId: 1, studentId: editId, data: payload });

    } else {

      createStudent.mutate({ schoolId, data: payload });

    }

  };



  const field = (key: keyof typeof form, val: string | boolean) => setForm((f) => ({ ...f, [key]: val }));

  const pending = createStudent.isPending || updateStudent.isPending;



  return (

    <Layout>

      <div className="space-y-6 max-w-2xl">

        <div className="flex items-center gap-3">

          <Button variant="ghost" size="icon" onClick={() => setLocation(isEdit ? `/students/${editId}` : "/students")}>

            <ArrowLeft className="h-4 w-4" />

          </Button>

          <div>

            <h1 className="text-2xl font-bold tracking-tight">{isEdit ? "Edit Student" : "Add Student"}</h1>

            <p className="text-muted-foreground text-sm">UDISE Phase-1 student master fields</p>

          </div>

        </div>



        <form onSubmit={handleSubmit} className="space-y-6">

          <Card>

            <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>

            <CardContent className="grid gap-4 grid-cols-2">

              <div className="space-y-1.5"><Label>First Name</Label><Input required value={form.firstName} onChange={(e) => field("firstName", e.target.value)} /></div>

              <div className="space-y-1.5"><Label>Last Name</Label><Input required value={form.lastName} onChange={(e) => field("lastName", e.target.value)} /></div>

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

              <div className="space-y-1.5"><Label>Date of Birth</Label><Input type="date" required value={form.dateOfBirth} onChange={(e) => field("dateOfBirth", e.target.value)} /></div>

              <div className="space-y-1.5"><Label>Roll Number</Label><Input value={form.rollNumber} onChange={(e) => field("rollNumber", e.target.value)} /></div>

              <div className="space-y-1.5"><Label>Blood Group</Label><Input value={form.bloodGroup} onChange={(e) => field("bloodGroup", e.target.value)} /></div>

              {!isEdit && (

                <div className="space-y-1.5"><Label>Admission Number</Label><Input value={form.admissionNumber} onChange={(e) => field("admissionNumber", e.target.value)} placeholder="Auto-generated if empty" /></div>

              )}

            </CardContent>

          </Card>



          <Card>

            <CardHeader><CardTitle className="text-base">Academic Details</CardTitle></CardHeader>

            <CardContent className="grid gap-4">

              <div className="space-y-1.5">

                <Label>Class</Label>

                <Select required value={form.classId} onValueChange={(v) => field("classId", v)}>

                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>

                  <SelectContent>

                    {(classes ?? []).map((c) => (

                      <SelectItem key={c.id} value={String(c.id)}>{c.name}{c.section ? ` - ${c.section}` : ""}</SelectItem>

                    ))}

                  </SelectContent>

                </Select>

              </div>

              <div className="space-y-1.5"><Label>Admission Date</Label><Input type="date" value={form.admissionDate} onChange={(e) => field("admissionDate", e.target.value)} /></div>

              <div className="space-y-1.5">

                <Label>Social Category</Label>

                <Select value={form.socialCategory} onValueChange={(v) => field("socialCategory", v)}>

                  <SelectTrigger><SelectValue /></SelectTrigger>

                  <SelectContent>

                    {["general", "sc", "st", "obc", "other"].map((v) => (

                      <SelectItem key={v} value={v}>{v.toUpperCase()}</SelectItem>

                    ))}

                  </SelectContent>

                </Select>

              </div>

              <div className="space-y-1.5"><Label>Religion</Label><Input value={form.religion} onChange={(e) => field("religion", e.target.value)} /></div>

              <div className="space-y-1.5"><Label>Aadhaar (optional)</Label><Input value={form.aadhaar} onChange={(e) => field("aadhaar", e.target.value)} /></div>

            </CardContent>

          </Card>



          <Card>

            <CardHeader><CardTitle className="text-base">Address & Transport</CardTitle></CardHeader>

            <CardContent className="grid gap-4">

              <div className="space-y-1.5"><Label>Address</Label><Input required value={form.address} onChange={(e) => field("address", e.target.value)} /></div>

              <label className="flex items-center gap-2 text-sm">

                <input type="checkbox" checked={form.transportAssigned} onChange={(e) => field("transportAssigned", e.target.checked)} />

                Transport assigned

              </label>

            </CardContent>

          </Card>



          <Card>

            <CardHeader><CardTitle className="text-base">Parent / Guardian</CardTitle></CardHeader>

            <CardContent className="grid gap-4 grid-cols-2">

              <div className="space-y-1.5"><Label>Father's Name</Label><Input required value={form.fatherName} onChange={(e) => field("fatherName", e.target.value)} /></div>

              <div className="space-y-1.5"><Label>Mother's Name</Label><Input required value={form.motherName} onChange={(e) => field("motherName", e.target.value)} /></div>

              <div className="space-y-1.5"><Label>Guardian Name</Label><Input value={form.guardianName} onChange={(e) => field("guardianName", e.target.value)} /></div>

              <div className="space-y-1.5"><Label>Parent Mobile</Label><Input required value={form.parentPhone} onChange={(e) => field("parentPhone", e.target.value)} placeholder="+91-9876543210" /></div>

              <div className="space-y-1.5"><Label>Parent Email</Label><Input type="email" required value={form.parentEmail} onChange={(e) => field("parentEmail", e.target.value)} /></div>

            </CardContent>

          </Card>



          <div className="flex gap-3">

            <Button type="submit" disabled={pending}>{pending ? "Saving..." : isEdit ? "Save Changes" : "Add Student"}</Button>

            <Button type="button" variant="outline" onClick={() => setLocation(isEdit ? `/students/${editId}` : "/students")}>Cancel</Button>

          </div>

        </form>

      </div>

    </Layout>

  );

}


