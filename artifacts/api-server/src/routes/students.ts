import { Router } from "express";
import { db, classesTable, sectionsTable, studentsTable } from "@workspace/db";
import { and, eq, like, sql } from "drizzle-orm";
import { CreateStudentBody, UpdateStudentBody } from "@workspace/api-zod";
import { toPgDate } from "../lib/db-values";
import { resolveSessionScope } from "../lib/scope";
import { studentListSelect } from "../lib/student-select";
import { mapStudentResponse } from "../lib/response-mappers";
import { StudentParentContactBody } from "../lib/udise-schemas";
import { calculateAge, generateRegistrationNumber } from "../lib/student-scope";
import {
  seedDocumentMasterForSchool,
  syncLegacyParentRelations,
} from "../lib/sync-student-relations";

const router = Router();

router.get("/branches/:branchId/sessions/:sessionId/students", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const scope = await resolveSessionScope(branchId, sessionId);
  if (!scope) return res.status(404).json({ error: "Session not found" });

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const search = req.query.search as string | undefined;
  const classId = req.query.classId ? Number(req.query.classId) : undefined;
  const status = req.query.status as string | undefined;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(studentsTable.branchId, branchId),
    eq(studentsTable.sessionId, sessionId),
  ];
  if (search) conditions.push(like(studentsTable.firstName, `%${search}%`));
  if (classId) conditions.push(eq(studentsTable.classId, classId));
  if (status) conditions.push(eq(studentsTable.status, status as "active"));

  const [students, countResult] = await Promise.all([
    db
      .select(studentListSelect)
      .from(studentsTable)
      .leftJoin(classesTable, eq(studentsTable.classId, classesTable.id))
      .leftJoin(sectionsTable, eq(studentsTable.sectionId, sectionsTable.id))
      .where(and(...conditions))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(studentsTable)
      .where(and(...conditions)),
  ]);

  return res.json({
    data: students.map(mapStudentResponse),
    total: Number(countResult[0].count),
    page,
    limit,
  });
});

router.post("/branches/:branchId/sessions/:sessionId/students", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const scope = await resolveSessionScope(branchId, sessionId);
  if (!scope) return res.status(404).json({ error: "Session not found" });

  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const body = { ...parsed.data, ...(req.body as Record<string, unknown>) } as Record<
    string,
    unknown
  >;
  const contactParsed = StudentParentContactBody.safeParse(body);
  if (!contactParsed.success) {
    return res.status(400).json({ error: contactParsed.error.issues[0]?.message ?? "Invalid parent contact" });
  }

  const admissionNumber = parsed.data.admissionNumber || `ADM-${Date.now()}`;
  const registrationNumber =
    (body.registrationNumber as string | undefined) || generateRegistrationNumber(branchId);
  const dobValue = (body.dob ?? body.dateOfBirth) as string | Date | undefined;
  const parentMobile = String(body.parentMobile ?? body.parentPhone ?? "");
  const parentEmail = String(body.parentEmail ?? "");
  const sectionId = Number(body.sectionId ?? 1);
  const [student] = await db
    .insert(studentsTable)
    .values({
      classId: Number(body.classId),
      sectionId,
      firstName: String(body.firstName),
      lastName: String(body.lastName),
      middleName: body.middleName != null ? String(body.middleName) : undefined,
      rollNumber: body.rollNumber != null ? String(body.rollNumber) : undefined,
      gender: body.gender as "male" | "female" | "other",
      bloodGroup: body.bloodGroup != null ? String(body.bloodGroup) : undefined,
      photoUrl: body.photoUrl != null ? String(body.photoUrl) : undefined,
      fatherName: String(body.fatherName ?? "NA"),
      motherName: String(body.motherName ?? "NA"),
      guardianName: body.guardianName != null ? String(body.guardianName) : undefined,
      parentEmail,
      address: String(body.address ?? "NA"),
      socialCategory: body.socialCategory as "general" | "sc" | "st" | "obc" | "other" | undefined,
      religion: body.religion != null ? String(body.religion) : undefined,
      aadhaar: body.aadhaar != null ? String(body.aadhaar) : undefined,
      admissionDate: body.admissionDate ? toPgDate(body.admissionDate as string) : undefined,
      transportAssigned: Boolean(body.transportAssigned),
      status: (body.status as "active" | undefined) ?? "active",
      societyId: scope.societyId,
      schoolId: scope.schoolId,
      branchId: scope.branchId,
      sessionId: scope.sessionId,
      admissionNumber,
      registrationNumber,
      dob: toPgDate(dobValue)!,
      parentMobile,
      nationality: body.nationality != null ? String(body.nationality) : undefined,
      penNumber: body.penNumber != null ? String(body.penNumber) : undefined,
      apaarId: body.apaarId != null ? String(body.apaarId) : undefined,
      udiseStudentId: body.udiseStudentId != null ? String(body.udiseStudentId) : undefined,
      isRteStudent: Boolean(body.isRteStudent),
      isCwsnStudent: Boolean(body.isCwsnStudent),
      house: body.house != null ? String(body.house) : undefined,
      signatureUrl: body.signatureUrl != null ? String(body.signatureUrl) : undefined,
    })
    .returning();

  await seedDocumentMasterForSchool(db, scope.societyId, scope.schoolId);
  await syncLegacyParentRelations(db, student, scope);

  const [withClass] = await db
    .select(studentListSelect)
    .from(studentsTable)
    .leftJoin(classesTable, eq(studentsTable.classId, classesTable.id))
    .leftJoin(sectionsTable, eq(studentsTable.sectionId, sectionsTable.id))
    .where(eq(studentsTable.id, student.id));

  return res.status(201).json(mapStudentResponse(withClass!));
});

router.get("/branches/:branchId/sessions/:sessionId/students/:studentId", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const studentId = Number(req.params.studentId);

  const [student] = await db
    .select(studentListSelect)
    .from(studentsTable)
    .leftJoin(classesTable, eq(studentsTable.classId, classesTable.id))
    .leftJoin(sectionsTable, eq(studentsTable.sectionId, sectionsTable.id))
    .where(
      and(
        eq(studentsTable.id, studentId),
        eq(studentsTable.branchId, branchId),
        eq(studentsTable.sessionId, sessionId),
      ),
    )
    .limit(1);

  if (!student) return res.status(404).json({ error: "Student not found" });
  return res.json(mapStudentResponse(student));
});

router.patch("/branches/:branchId/sessions/:sessionId/students/:studentId", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const studentId = Number(req.params.studentId);
  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const body = { ...parsed.data, ...(req.body as Record<string, unknown>) } as Record<
    string,
    unknown
  >;
  if (body.parentEmail != null || body.parentPhone != null || body.parentMobile != null) {
    const contactParsed = StudentParentContactBody.safeParse(body);
    if (!contactParsed.success) {
      return res.status(400).json({ error: contactParsed.error.issues[0]?.message ?? "Invalid parent contact" });
    }
  }
  const parentMobile = body.parentMobile ?? body.parentPhone;
  const parentEmail = body.parentEmail != null ? String(body.parentEmail) : undefined;
  const { dob: _d, dateOfBirth: _db, parentPhone: _pp, parentMobile: _pm, category: _cat, ...rest } = body;
  const socialCategory = (body.socialCategory ?? body.category) as
    | "general"
    | "sc"
    | "st"
    | "obc"
    | "other"
    | undefined;
  const dobValue = body.dob ?? body.dateOfBirth;
  await db
    .update(studentsTable)
    .set({
      ...(rest as Record<string, unknown>),
      ...(dobValue != null ? { dob: toPgDate(dobValue as string | Date) } : {}),
      ...(parentMobile != null ? { parentMobile: String(parentMobile) } : {}),
      ...(parentEmail != null ? { parentEmail } : {}),
      ...(socialCategory != null ? { socialCategory } : {}),
      ...(body.admissionDate != null ? { admissionDate: toPgDate(body.admissionDate as string) } : {}),
    } as typeof studentsTable.$inferInsert)
    .where(
      and(
        eq(studentsTable.id, studentId),
        eq(studentsTable.branchId, branchId),
        eq(studentsTable.sessionId, sessionId),
      ),
    );

  const [student] = await db
    .select(studentListSelect)
    .from(studentsTable)
    .leftJoin(classesTable, eq(studentsTable.classId, classesTable.id))
    .leftJoin(sectionsTable, eq(studentsTable.sectionId, sectionsTable.id))
    .where(eq(studentsTable.id, studentId));

  if (!student) return res.status(404).json({ error: "Student not found" });
  return res.json(mapStudentResponse(student));
});

router.delete("/branches/:branchId/sessions/:sessionId/students/:studentId", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const studentId = Number(req.params.studentId);

  await db
    .delete(studentsTable)
    .where(
      and(
        eq(studentsTable.id, studentId),
        eq(studentsTable.branchId, branchId),
        eq(studentsTable.sessionId, sessionId),
      ),
    );

  return res.json({ message: "Student removed" });
});

export default router;
