import { useEffect, useState } from "react";

import { Layout } from "@/components/layout";

import { apiGet, apiSend } from "@/lib/api";

import { useScope } from "@/lib/use-scope";

import { useListClasses } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";



type ExamType = { id: number; code: string; name: string };

type Exam = { id: number; name: string; examDate: string; classId: number; maxMarks?: number };

type ExamResult = { id: number; studentId: number; studentName: string; marksObtained?: number; grade?: string };



export default function ExaminationsPage() {

  const { branchId, sessionId, schoolId } = useScope();

  const { data: classes } = useListClasses(schoolId);

  const [examTypes, setExamTypes] = useState<ExamType[]>([]);

  const [exams, setExams] = useState<Exam[]>([]);

  const [results, setResults] = useState<ExamResult[]>([]);

  const [selectedExamId, setSelectedExamId] = useState("");

  const [typeForm, setTypeForm] = useState({ code: "", name: "", isTermExam: false });

  const [examForm, setExamForm] = useState({ examTypeId: "", classId: "", name: "", examDate: "", maxMarks: "100" });

  const [resultForm, setResultForm] = useState({ studentId: "", marksObtained: "", grade: "", remarks: "" });



  const base = `/branches/${branchId}/sessions/${sessionId}`;



  const load = async () => {

    const [types, examList] = await Promise.all([

      apiGet<{ data: ExamType[] }>(`${base}/exam-types`),

      apiGet<{ data: Exam[] }>(`${base}/exams`),

    ]);

    setExamTypes(types.data);

    setExams(examList.data);

  };



  const loadResults = async (examId: string) => {

    if (!examId) return setResults([]);

    const r = await apiGet<{ data: ExamResult[] }>(`${base}/exams/${examId}/results`);

    setResults(r.data);

  };



  useEffect(() => {

    load().catch(console.error);

  }, [branchId, sessionId]);



  useEffect(() => {

    loadResults(selectedExamId).catch(console.error);

  }, [selectedExamId, branchId, sessionId]);



  return (

    <Layout>

      <div className="space-y-6">

        <h1 className="text-2xl font-bold">Examinations</h1>



        <Card>

          <CardHeader><CardTitle className="text-base">Exam Types</CardTitle></CardHeader>

          <CardContent className="space-y-4">

            <form

              className="flex gap-3 flex-wrap items-end"

              onSubmit={async (e) => {

                e.preventDefault();

                await apiSend(`${base}/exam-types`, "POST", { ...typeForm, isTermExam: typeForm.isTermExam });

                setTypeForm({ code: "", name: "", isTermExam: false });

                await load();

              }}

            >

              <div><Label>Code</Label><Input value={typeForm.code} onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })} required /></div>

              <div><Label>Name</Label><Input value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} required /></div>

              <label className="flex items-center gap-2 text-sm pb-2">

                <input type="checkbox" checked={typeForm.isTermExam} onChange={(e) => setTypeForm({ ...typeForm, isTermExam: e.target.checked })} />

                Term exam

              </label>

              <Button type="submit">Add Type</Button>

            </form>

            {examTypes.map((t) => <div key={t.id} className="text-sm">{t.name} ({t.code})</div>)}

          </CardContent>

        </Card>



        <Card>

          <CardHeader><CardTitle className="text-base">Schedule Exam</CardTitle></CardHeader>

          <CardContent className="space-y-4">

            <form

              className="grid gap-3 md:grid-cols-3"

              onSubmit={async (e) => {

                e.preventDefault();

                await apiSend(`${base}/exams`, "POST", {

                  examTypeId: Number(examForm.examTypeId),

                  classId: Number(examForm.classId),

                  name: examForm.name,

                  examDate: examForm.examDate,

                  maxMarks: Number(examForm.maxMarks),

                });

                setExamForm({ examTypeId: "", classId: "", name: "", examDate: "", maxMarks: "100" });

                await load();

              }}

            >

              <div>

                <Label>Exam Type</Label>

                <Select value={examForm.examTypeId} onValueChange={(v) => setExamForm({ ...examForm, examTypeId: v })}>

                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>

                  <SelectContent>{examTypes.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>

                </Select>

              </div>

              <div>

                <Label>Class</Label>

                <Select value={examForm.classId} onValueChange={(v) => setExamForm({ ...examForm, classId: v })}>

                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>

                  <SelectContent>{(classes ?? []).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>

                </Select>

              </div>

              <div><Label>Name</Label><Input value={examForm.name} onChange={(e) => setExamForm({ ...examForm, name: e.target.value })} required /></div>

              <div><Label>Date</Label><Input type="date" value={examForm.examDate} onChange={(e) => setExamForm({ ...examForm, examDate: e.target.value })} required /></div>

              <div><Label>Max Marks</Label><Input value={examForm.maxMarks} onChange={(e) => setExamForm({ ...examForm, maxMarks: e.target.value })} /></div>

              <Button type="submit" className="self-end">Schedule Exam</Button>

            </form>

            {exams.map((ex) => <div key={ex.id} className="text-sm border-b py-2">{ex.name} — {ex.examDate}</div>)}

          </CardContent>

        </Card>



        <Card>

          <CardHeader><CardTitle className="text-base">Marks / Grade Entry</CardTitle></CardHeader>

          <CardContent className="space-y-4">

            <div className="max-w-xs">

              <Label>Select Exam</Label>

              <Select value={selectedExamId} onValueChange={setSelectedExamId}>

                <SelectTrigger><SelectValue placeholder="Choose exam" /></SelectTrigger>

                <SelectContent>{exams.map((ex) => <SelectItem key={ex.id} value={String(ex.id)}>{ex.name}</SelectItem>)}</SelectContent>

              </Select>

            </div>

            {selectedExamId && (

              <form

                className="grid gap-3 md:grid-cols-4 items-end"

                onSubmit={async (e) => {

                  e.preventDefault();

                  await apiSend(`${base}/exams/${selectedExamId}/results`, "POST", {

                    studentId: Number(resultForm.studentId),

                    marksObtained: resultForm.marksObtained ? Number(resultForm.marksObtained) : undefined,

                    grade: resultForm.grade || undefined,

                    remarks: resultForm.remarks || undefined,

                  });

                  setResultForm({ studentId: "", marksObtained: "", grade: "", remarks: "" });

                  await loadResults(selectedExamId);

                }}

              >

                <div><Label>Student ID</Label><Input value={resultForm.studentId} onChange={(e) => setResultForm({ ...resultForm, studentId: e.target.value })} required /></div>

                <div><Label>Marks</Label><Input type="number" value={resultForm.marksObtained} onChange={(e) => setResultForm({ ...resultForm, marksObtained: e.target.value })} /></div>

                <div><Label>Grade</Label><Input value={resultForm.grade} onChange={(e) => setResultForm({ ...resultForm, grade: e.target.value })} /></div>

                <Button type="submit">Save Result</Button>

              </form>

            )}

            {results.map((r) => (

              <div key={r.id} className="text-sm flex justify-between border-b py-2">

                <span>{r.studentName} (#{r.studentId})</span>

                <span>{r.marksObtained != null ? `${r.marksObtained} marks` : r.grade ?? "—"}</span>

              </div>

            ))}

          </CardContent>

        </Card>

      </div>

    </Layout>

  );

}


