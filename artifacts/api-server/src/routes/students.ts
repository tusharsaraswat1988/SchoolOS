import { Router } from "express";
import { db, studentsTable, classesTable, schoolsTable } from "@workspace/db";
import { eq, like, sql, and } from "drizzle-orm";
import { CreateStudentBody, UpdateStudentBody } from "@workspace/api-zod";

const router = Router();

router.get("/schools/:schoolId/students", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const search = req.query.search as string | undefined;
  const classId = req.query.classId ? Number(req.query.classId) : undefined;
  const status = req.query.status as string | undefined;
  const offset = (page - 1) * limit;

  const conditions = [eq(studentsTable.schoolId, schoolId)];
  if (search) conditions.push(like(studentsTable.firstName, `%${search}%`));
  if (classId) conditions.push(eq(studentsTable.classId, classId));
  if (status) conditions.push(eq(studentsTable.status, status as any));

  const [students, countResult] = await Promise.all([
    db
      .select({
        id: studentsTable.id,
        admissionNumber: studentsTable.admissionNumber,
        rollNumber: studentsTable.rollNumber,
        firstName: studentsTable.firstName,
        middleName: studentsTable.middleName,
        lastName: studentsTable.lastName,
        gender: studentsTable.gender,
        dateOfBirth: studentsTable.dateOfBirth,
        bloodGroup: studentsTable.bloodGroup,
        category: studentsTable.category,
        photoUrl: studentsTable.photoUrl,
        classId: studentsTable.classId,
        className: classesTable.name,
        section: studentsTable.section,
        schoolId: studentsTable.schoolId,
        fatherName: studentsTable.fatherName,
        motherName: studentsTable.motherName,
        parentPhone: studentsTable.parentPhone,
        parentEmail: studentsTable.parentEmail,
        address: studentsTable.address,
        status: studentsTable.status,
        createdAt: studentsTable.createdAt,
      })
      .from(studentsTable)
      .leftJoin(classesTable, eq(studentsTable.classId, classesTable.id))
      .where(and(...conditions))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(studentsTable).where(and(...conditions)),
  ]);

  return res.json({ data: students, total: Number(countResult[0].count), page, limit });
});

router.post("/schools/:schoolId/students", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const admissionNumber = parsed.data.admissionNumber || `ADM-${Date.now()}`;
  const [student] = await db
    .insert(studentsTable)
    .values({ ...parsed.data, schoolId, admissionNumber })
    .returning();

  await db
    .update(schoolsTable)
    .set({ studentCount: sql`${schoolsTable.studentCount} + 1` })
    .where(eq(schoolsTable.id, schoolId));

  const [withClass] = await db
    .select({
      id: studentsTable.id,
      admissionNumber: studentsTable.admissionNumber,
      rollNumber: studentsTable.rollNumber,
      firstName: studentsTable.firstName,
      middleName: studentsTable.middleName,
      lastName: studentsTable.lastName,
      gender: studentsTable.gender,
      dateOfBirth: studentsTable.dateOfBirth,
      bloodGroup: studentsTable.bloodGroup,
      category: studentsTable.category,
      photoUrl: studentsTable.photoUrl,
      classId: studentsTable.classId,
      className: classesTable.name,
      section: studentsTable.section,
      schoolId: studentsTable.schoolId,
      fatherName: studentsTable.fatherName,
      motherName: studentsTable.motherName,
      parentPhone: studentsTable.parentPhone,
      parentEmail: studentsTable.parentEmail,
      address: studentsTable.address,
      status: studentsTable.status,
      createdAt: studentsTable.createdAt,
    })
    .from(studentsTable)
    .leftJoin(classesTable, eq(studentsTable.classId, classesTable.id))
    .where(eq(studentsTable.id, student.id));

  return res.status(201).json(withClass);
});

router.get("/schools/:schoolId/students/:studentId", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const studentId = Number(req.params.studentId);

  const [student] = await db
    .select({
      id: studentsTable.id,
      admissionNumber: studentsTable.admissionNumber,
      rollNumber: studentsTable.rollNumber,
      firstName: studentsTable.firstName,
      middleName: studentsTable.middleName,
      lastName: studentsTable.lastName,
      gender: studentsTable.gender,
      dateOfBirth: studentsTable.dateOfBirth,
      bloodGroup: studentsTable.bloodGroup,
      category: studentsTable.category,
      photoUrl: studentsTable.photoUrl,
      classId: studentsTable.classId,
      className: classesTable.name,
      section: studentsTable.section,
      schoolId: studentsTable.schoolId,
      fatherName: studentsTable.fatherName,
      motherName: studentsTable.motherName,
      parentPhone: studentsTable.parentPhone,
      parentEmail: studentsTable.parentEmail,
      address: studentsTable.address,
      status: studentsTable.status,
      createdAt: studentsTable.createdAt,
    })
    .from(studentsTable)
    .leftJoin(classesTable, eq(studentsTable.classId, classesTable.id))
    .where(and(eq(studentsTable.id, studentId), eq(studentsTable.schoolId, schoolId)))
    .limit(1);

  if (!student) return res.status(404).json({ error: "Student not found" });
  return res.json(student);
});

router.patch("/schools/:schoolId/students/:studentId", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const studentId = Number(req.params.studentId);
  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  await db
    .update(studentsTable)
    .set(parsed.data)
    .where(and(eq(studentsTable.id, studentId), eq(studentsTable.schoolId, schoolId)));

  const [student] = await db
    .select({
      id: studentsTable.id,
      admissionNumber: studentsTable.admissionNumber,
      rollNumber: studentsTable.rollNumber,
      firstName: studentsTable.firstName,
      middleName: studentsTable.middleName,
      lastName: studentsTable.lastName,
      gender: studentsTable.gender,
      dateOfBirth: studentsTable.dateOfBirth,
      bloodGroup: studentsTable.bloodGroup,
      category: studentsTable.category,
      photoUrl: studentsTable.photoUrl,
      classId: studentsTable.classId,
      className: classesTable.name,
      section: studentsTable.section,
      schoolId: studentsTable.schoolId,
      fatherName: studentsTable.fatherName,
      motherName: studentsTable.motherName,
      parentPhone: studentsTable.parentPhone,
      parentEmail: studentsTable.parentEmail,
      address: studentsTable.address,
      status: studentsTable.status,
      createdAt: studentsTable.createdAt,
    })
    .from(studentsTable)
    .leftJoin(classesTable, eq(studentsTable.classId, classesTable.id))
    .where(eq(studentsTable.id, studentId));

  if (!student) return res.status(404).json({ error: "Student not found" });
  return res.json(student);
});

router.delete("/schools/:schoolId/students/:studentId", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const studentId = Number(req.params.studentId);

  await db.delete(studentsTable).where(and(eq(studentsTable.id, studentId), eq(studentsTable.schoolId, schoolId)));

  await db
    .update(schoolsTable)
    .set({ studentCount: sql`GREATEST(${schoolsTable.studentCount} - 1, 0)` })
    .where(eq(schoolsTable.id, schoolId));

  return res.json({ message: "Student removed" });
});

export default router;
