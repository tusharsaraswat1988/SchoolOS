import { Router } from "express";
import {
  db,
  examResultsTable,
  examsTable,
  examTypesTable,
  studentsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import {
  CreateExamBody,
  CreateExamTypeBody,
  UpsertExamResultBody,
} from "../lib/udise-schemas";
import { resolveSessionScope } from "../lib/scope";
import { toPgDate } from "../lib/db-values";

const router = Router();

router.get("/branches/:branchId/sessions/:sessionId/exam-types", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const scope = await resolveSessionScope(branchId, sessionId);
  if (!scope) return res.status(404).json({ error: "Session not found" });

  const rows = await db
    .select()
    .from(examTypesTable)
    .where(and(eq(examTypesTable.branchId, branchId), eq(examTypesTable.sessionId, sessionId)));

  return res.json({ data: rows, total: rows.length });
});

router.post("/branches/:branchId/sessions/:sessionId/exam-types", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const scope = await resolveSessionScope(branchId, sessionId);
  if (!scope) return res.status(404).json({ error: "Session not found" });

  const parsed = CreateExamTypeBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const [row] = await db
    .insert(examTypesTable)
    .values({
      ...parsed.data,
      societyId: scope.societyId,
      schoolId: scope.schoolId,
      branchId: scope.branchId,
      sessionId: scope.sessionId,
    })
    .returning();

  return res.status(201).json(row);
});

router.get("/branches/:branchId/sessions/:sessionId/exams", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const rows = await db
    .select()
    .from(examsTable)
    .where(and(eq(examsTable.branchId, branchId), eq(examsTable.sessionId, sessionId)));

  return res.json({ data: rows, total: rows.length });
});

router.post("/branches/:branchId/sessions/:sessionId/exams", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const scope = await resolveSessionScope(branchId, sessionId);
  if (!scope) return res.status(404).json({ error: "Session not found" });

  const parsed = CreateExamBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const [row] = await db
    .insert(examsTable)
    .values({
      examTypeId: parsed.data.examTypeId,
      classId: parsed.data.classId,
      name: parsed.data.name,
      examDate: toPgDate(parsed.data.examDate)!,
      maxMarks: parsed.data.maxMarks,
      societyId: scope.societyId,
      schoolId: scope.schoolId,
      branchId: scope.branchId,
      sessionId: scope.sessionId,
    })
    .returning();

  return res.status(201).json(row);
});

router.get("/branches/:branchId/sessions/:sessionId/exams/:examId/results", async (req, res) => {
  const examId = Number(req.params.examId);
  const rows = await db
    .select({
      id: examResultsTable.id,
      examId: examResultsTable.examId,
      studentId: examResultsTable.studentId,
      marksObtained: examResultsTable.marksObtained,
      grade: examResultsTable.grade,
      remarks: examResultsTable.remarks,
      studentName: studentsTable.firstName,
      admissionNumber: studentsTable.admissionNumber,
    })
    .from(examResultsTable)
    .innerJoin(studentsTable, eq(examResultsTable.studentId, studentsTable.id))
    .where(eq(examResultsTable.examId, examId));

  return res.json({ data: rows, total: rows.length });
});

router.post("/branches/:branchId/sessions/:sessionId/exams/:examId/results", async (req, res) => {
  const examId = Number(req.params.examId);
  const parsed = UpsertExamResultBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const [existing] = await db
    .select()
    .from(examResultsTable)
    .where(
      and(
        eq(examResultsTable.examId, examId),
        eq(examResultsTable.studentId, parsed.data.studentId),
      ),
    )
    .limit(1);

  const values = {
    marksObtained: parsed.data.marksObtained,
    grade: parsed.data.grade,
    remarks: parsed.data.remarks,
  };

  const [row] = existing
    ? await db
        .update(examResultsTable)
        .set(values)
        .where(eq(examResultsTable.id, existing.id))
        .returning()
    : await db
        .insert(examResultsTable)
        .values({ examId, studentId: parsed.data.studentId, ...values })
        .returning();

  return res.status(existing ? 200 : 201).json(row);
});

export default router;
