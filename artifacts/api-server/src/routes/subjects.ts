import { Router } from "express";
import {
  classSubjectsTable,
  classesTable,
  db,
  subjectsTable,
  teacherSubjectsTable,
  usersTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { CreateClassSubjectBody, CreateSubjectBody, CreateTeacherSubjectBody } from "../lib/udise-schemas";
import { resolveSessionScope } from "../lib/scope";

const router = Router();

router.get("/branches/:branchId/sessions/:sessionId/subjects", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const scope = await resolveSessionScope(branchId, sessionId);
  if (!scope) return res.status(404).json({ error: "Session not found" });

  const subjects = await db
    .select()
    .from(subjectsTable)
    .where(and(eq(subjectsTable.branchId, branchId), eq(subjectsTable.sessionId, sessionId)));

  return res.json({ data: subjects, total: subjects.length });
});

router.post("/branches/:branchId/sessions/:sessionId/subjects", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const scope = await resolveSessionScope(branchId, sessionId);
  if (!scope) return res.status(404).json({ error: "Session not found" });

  const parsed = CreateSubjectBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const [subject] = await db
    .insert(subjectsTable)
    .values({
      ...parsed.data,
      societyId: scope.societyId,
      schoolId: scope.schoolId,
      branchId: scope.branchId,
      sessionId: scope.sessionId,
    })
    .returning();

  return res.status(201).json(subject);
});

router.get(
  "/branches/:branchId/sessions/:sessionId/classes/:classId/subjects",
  async (req, res) => {
    const classId = Number(req.params.classId);
    const rows = await db
      .select({
        id: classSubjectsTable.id,
        classId: classSubjectsTable.classId,
        subjectId: classSubjectsTable.subjectId,
        isMandatory: classSubjectsTable.isMandatory,
        subjectCode: subjectsTable.code,
        subjectName: subjectsTable.name,
      })
      .from(classSubjectsTable)
      .innerJoin(subjectsTable, eq(classSubjectsTable.subjectId, subjectsTable.id))
      .where(eq(classSubjectsTable.classId, classId));

    return res.json({ data: rows, total: rows.length });
  },
);

router.post(
  "/branches/:branchId/sessions/:sessionId/classes/:classId/subjects",
  async (req, res) => {
    const classId = Number(req.params.classId);
    const parsed = CreateClassSubjectBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

    const [row] = await db
      .insert(classSubjectsTable)
      .values({
        classId,
        subjectId: parsed.data.subjectId,
        isMandatory: parsed.data.isMandatory ?? true,
      })
      .returning();

    return res.status(201).json(row);
  },
);

router.get("/branches/:branchId/users/:userId/subjects", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const userId = Number(req.params.userId);

  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.branchId, branchId)))
    .limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const rows = await db
    .select({
      id: teacherSubjectsTable.id,
      userId: teacherSubjectsTable.userId,
      subjectId: teacherSubjectsTable.subjectId,
      classId: teacherSubjectsTable.classId,
      subjectCode: subjectsTable.code,
      subjectName: subjectsTable.name,
      className: classesTable.name,
    })
    .from(teacherSubjectsTable)
    .innerJoin(subjectsTable, eq(teacherSubjectsTable.subjectId, subjectsTable.id))
    .leftJoin(classesTable, eq(teacherSubjectsTable.classId, classesTable.id))
    .where(eq(teacherSubjectsTable.userId, userId));

  return res.json({ data: rows, total: rows.length });
});

router.post("/branches/:branchId/users/:userId/subjects", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const userId = Number(req.params.userId);

  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.branchId, branchId)))
    .limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const parsed = CreateTeacherSubjectBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const [row] = await db
    .insert(teacherSubjectsTable)
    .values({
      userId,
      subjectId: parsed.data.subjectId,
      classId: parsed.data.classId ?? null,
    })
    .returning();

  return res.status(201).json(row);
});

router.delete("/branches/:branchId/users/:userId/subjects/:assignmentId", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const userId = Number(req.params.userId);
  const assignmentId = Number(req.params.assignmentId);

  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.branchId, branchId)))
    .limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  await db
    .delete(teacherSubjectsTable)
    .where(and(eq(teacherSubjectsTable.id, assignmentId), eq(teacherSubjectsTable.userId, userId)));

  return res.json({ message: "Assignment removed" });
});

export default router;
