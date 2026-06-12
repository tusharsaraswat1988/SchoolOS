import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Layout } from "@/components/layout";
import { useOperationalScope } from "@/lib/use-scope";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { StudentIdentityTab, type IdentityFormState } from "@/components/student-master/identity-tab";
import { StudentRelationsTab } from "@/components/student-master/relations-tab";
import { StudentDocumentsTab } from "@/components/student-master/documents-tab";
import { apiGet } from "@/lib/api";

const emptyForm: IdentityFormState = {
  firstName: "",
  middleName: "",
  lastName: "",
  gender: "male",
  dateOfBirth: "",
  bloodGroup: "",
  registrationNumber: "",
  admissionNumber: "",
  rollNumber: "",
  socialCategory: "general",
  religion: "",
  nationality: "Indian",
  aadhaar: "",
  penNumber: "",
  apaarId: "",
  udiseStudentId: "",
  isRteStudent: false,
  isCwsnStudent: false,
  classId: "",
  sectionId: "",
  house: "",
  admissionDate: "",
  status: "active",
  photoUrl: "",
  signatureUrl: "",
  address: "",
  fatherName: "",
  motherName: "",
  parentPhone: "",
  parentEmail: "",
};

export default function StudentForm() {
  const params = useParams<{ id?: string }>();
  const editId = params.id ? Number(params.id) : null;
  const isEdit = editId != null && !Number.isNaN(editId);
  const [, setLocation] = useLocation();
  const scope = useOperationalScope();
  const branchId = scope?.branchId ?? 0;
  const sessionId = scope?.sessionId ?? 0;
  const schoolId = scope?.schoolId ?? 0;
  const qc = useQueryClient();

  const initialTab =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("tab") ?? "student"
      : "student";
  const [tab, setTab] = useState(initialTab);
  const [form, setForm] = useState(emptyForm);
  const [sections, setSections] = useState<Array<{ id: number; name: string; classId: number }>>([]);

  const { data: existing } = useGetStudent(branchId, sessionId, editId ?? 0, {
    query: { enabled: isEdit && !!branchId && !!sessionId, queryKey: getGetStudentQueryKey(branchId, sessionId, editId ?? 0) },
  });

  const { data: classes } = useListClasses(branchId, sessionId, {
    query: { enabled: !!branchId && !!sessionId, queryKey: [`classes`, branchId, sessionId] },
  });

  useEffect(() => {
    if (!existing || !isEdit) return;
    const ext = existing as unknown as Record<string, unknown>;
    setForm({
      firstName: existing.firstName ?? "",
      middleName: String(ext.middleName ?? ""),
      lastName: existing.lastName ?? "",
      gender: existing.gender ?? "male",
      dateOfBirth: existing.dateOfBirth ? String(existing.dateOfBirth).slice(0, 10) : "",
      bloodGroup: existing.bloodGroup ?? "",
      registrationNumber: String(ext.registrationNumber ?? ""),
      admissionNumber: existing.admissionNumber ?? "",
      rollNumber: existing.rollNumber ?? "",
      socialCategory: existing.category ?? "general",
      religion: String(ext.religion ?? ""),
      nationality: String(ext.nationality ?? "Indian"),
      aadhaar: String(ext.aadhaar ?? ""),
      penNumber: String(ext.penNumber ?? ""),
      apaarId: String(ext.apaarId ?? ""),
      udiseStudentId: String(ext.udiseStudentId ?? ""),
      isRteStudent: Boolean(ext.isRteStudent),
      isCwsnStudent: Boolean(ext.isCwsnStudent),
      classId: String(existing.classId ?? ""),
      sectionId: String(ext.sectionId ?? existing.section ?? ""),
      house: String(ext.house ?? ""),
      admissionDate: ext.admissionDate ? String(ext.admissionDate).slice(0, 10) : "",
      status: existing.status ?? "active",
      photoUrl: String(ext.photoUrl ?? ""),
      signatureUrl: String(ext.signatureUrl ?? ""),
      address: String(ext.address ?? ""),
      fatherName: existing.fatherName ?? "",
      motherName: existing.motherName ?? "",
      parentPhone: existing.parentPhone ?? "",
      parentEmail: existing.parentEmail ?? "",
    });
  }, [existing, isEdit]);

  useEffect(() => {
    if (!form.classId || !branchId || !sessionId) return;
    apiGet<Array<{ id: number; name: string; classId: number }>>(
      `/branches/${branchId}/sessions/${sessionId}/classes/${form.classId}/sections`,
    )
      .then((res) => setSections(Array.isArray(res) ? res : []))
      .catch(() => setSections([]));
  }, [form.classId, branchId, sessionId]);

  const createStudent = useCreateStudent({
    mutation: {
      onSuccess: (student) => {
        qc.invalidateQueries({ queryKey: getListStudentsQueryKey(branchId, sessionId) });
        setLocation(`/students/${student.id}/edit?tab=relations`);
      },
    },
  });

  const updateStudent = useUpdateStudent({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListStudentsQueryKey(branchId, sessionId) });
        qc.invalidateQueries({ queryKey: getGetStudentQueryKey(branchId, sessionId, editId!) });
      },
    },
  });

  const onChange = (key: keyof IdentityFormState, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const buildPayload = () => ({
    firstName: form.firstName,
    middleName: form.middleName || undefined,
    lastName: form.lastName,
    classId: Number(form.classId),
    sectionId: form.sectionId ? Number(form.sectionId) : 1,
    gender: form.gender as "male" | "female" | "other",
    dateOfBirth: form.dateOfBirth,
    rollNumber: form.rollNumber || undefined,
    bloodGroup: form.bloodGroup || undefined,
    registrationNumber: form.registrationNumber || undefined,
    admissionNumber: form.admissionNumber || undefined,
    socialCategory: form.socialCategory as "general" | "sc" | "st" | "obc" | "other",
    religion: form.religion || undefined,
    nationality: form.nationality || undefined,
    aadhaar: form.aadhaar || undefined,
    penNumber: form.penNumber || undefined,
    apaarId: form.apaarId || undefined,
    udiseStudentId: form.udiseStudentId || undefined,
    isRteStudent: form.isRteStudent,
    isCwsnStudent: form.isCwsnStudent,
    house: form.house || undefined,
    admissionDate: form.admissionDate || undefined,
    status: form.status as "active" | "inactive" | "transferred" | "graduated",
    photoUrl: form.photoUrl || undefined,
    signatureUrl: form.signatureUrl || undefined,
    address: form.address,
    fatherName: form.fatherName,
    motherName: form.motherName,
    parentPhone: form.parentPhone,
    parentEmail: form.parentEmail,
  });

  const handleSaveIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    if (isEdit && editId) {
      updateStudent.mutate({ branchId, sessionId, studentId: editId, data: payload });
    } else {
      createStudent.mutate({ branchId, sessionId, data: payload });
    }
  };

  const pending = createStudent.isPending || updateStudent.isPending;

  if (!scope) {
    return (
      <Layout>
        <p className="text-muted-foreground">Select a branch and session to manage students.</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation(isEdit ? `/students/${editId}` : "/students")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isEdit ? "Student Master" : "Add Student"}
            </h1>
            <p className="text-muted-foreground text-sm">Identity · Relations · Documents</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="student">Student</TabsTrigger>
            <TabsTrigger value="relations" disabled={!isEdit}>Relations</TabsTrigger>
            <TabsTrigger value="documents" disabled={!isEdit}>Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="student" className="mt-6">
            <form onSubmit={handleSaveIdentity} className="space-y-6">
              <StudentIdentityTab
                form={form}
                onChange={onChange}
                classes={classes ?? []}
                sections={sections}
                isEdit={isEdit}
              />
              <div className="flex gap-3">
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving..." : isEdit ? "Save Student" : "Create Student"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setLocation(isEdit ? `/students/${editId}` : "/students")}>
                  Cancel
                </Button>
              </div>
            </form>
          </TabsContent>

          {isEdit && editId && (
            <>
              <TabsContent value="relations" className="mt-6">
                <StudentRelationsTab
                  branchId={branchId}
                  sessionId={sessionId}
                  studentId={editId}
                  schoolId={schoolId}
                />
              </TabsContent>
              <TabsContent value="documents" className="mt-6">
                <StudentDocumentsTab branchId={branchId} sessionId={sessionId} studentId={editId} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
