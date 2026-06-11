import { Router } from "express";
import {
  classesTable,
  db,
  sectionsTable,
  studentsTable,
  usersTable,
} from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { CreateClassBody, CreateSectionBody } from "@workspace/api-zod";
import { PatchClassBody } from "../lib/udise-schemas";
import { resolveSessionScope } from "../lib/scope";
import { mapClassResponse } from "../lib/response-mappers";

const router = Router();

router.get("/branches/:branchId/sessions/:sessionId/classes", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const scope = await resolveSessionScope(branchId, sessionId);
  if (!scope) return res.status(404).json({ error: "Session not found" });

  const classes = await db
    .select({
      id: classesTable.id,
      code: classesTable.code,
      name: classesTable.name,
      gradeOrder: classesTable.gradeOrder,
      classTeacherUserId: classesTable.classTeacherUserId,
      classTeacherName: usersTable.name,
      societyId: classesTable.societyId,
      schoolId: classesTable.schoolId,
      branchId: classesTable.branchId,
      sessionId: classesTable.sessionId,
      status: classesTable.status,
      studentCount: sql<number>`count(distinct ${studentsTable.id})`,
      sectionCount: sql<number>`count(distinct ${sectionsTable.id})`,
    })
    .from(classesTable)
    .leftJoin(usersTable, eq(classesTable.classTeacherUserId, usersTable.id))
    .leftJoin(
      studentsTable,
      and(eq(studentsTable.classId, classesTable.id), eq(studentsTable.status, "active")),
    )
    .leftJoin(sectionsTable, eq(sectionsTable.classId, classesTable.id))
    .where(and(eq(classesTable.branchId, branchId), eq(classesTable.sessionId, sessionId)))
    .groupBy(classesTable.id, usersTable.name);

  return res.json(classes.map(mapClassResponse));
});

router.post("/branches/:branchId/sessions/:sessionId/classes", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const scope = await resolveSessionScope(branchId, sessionId);
  if (!scope) return res.status(404).json({ error: "Session not found" });

  const parsed = CreateClassBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const body = parsed.data as Record<string, unknown>;
  const [cls] = await db
    .insert(classesTable)
    .values({
      code: String(body.code ?? body.name ?? "CLASS").slice(0, 10).toUpperCase(),
      name: String(body.name),
      gradeOrder: body.gradeOrder != null ? Number(body.gradeOrder) : body.grade != null ? Number(body.grade) : null,
      classTeacherUserId:
        body.classTeacherUserId != null
          ? Number(body.classTeacherUserId)
          : body.classTeacherId != null
            ? Number(body.classTeacherId)
            : null,
      societyId: scope.societyId,
      schoolId: scope.schoolId,
      branchId: scope.branchId,
      sessionId: scope.sessionId,
    })
    .returning();

  return res.status(201).json(mapClassResponse({ ...cls, studentCount: 0, sectionCount: 0 }));
});

router.patch(
  "/branches/:branchId/sessions/:sessionId/classes/:classId",
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const sessionId = Number(req.params.sessionId);
    const classId = Number(req.params.classId);
    const scope = await resolveSessionScope(branchId, sessionId);
    if (!scope) return res.status(404).json({ error: "Session not found" });

    const parsed = PatchClassBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

    const hasTeacherField =
      parsed.data.classTeacherUserId !== undefined ||
      parsed.data.classTeacherId !== undefined;
    const teacherId = hasTeacherField
      ? (parsed.data.classTeacherUserId ?? parsed.data.classTeacherId ?? null)
      : undefined;

    const [cls] = await db
      .update(classesTable)
      .set({
        ...(parsed.data.name != null ? { name: parsed.data.name } : {}),
        ...(hasTeacherField ? { classTeacherUserId: teacherId } : {}),
      })
      .where(
        and(
          eq(classesTable.id, classId),
          eq(classesTable.branchId, branchId),
          eq(classesTable.sessionId, sessionId),
        ),
      )
      .returning();

    if (!cls) return res.status(404).json({ error: "Class not found" });

    const [withTeacher] = await db
      .select({
        id: classesTable.id,
        code: classesTable.code,
        name: classesTable.name,
        gradeOrder: classesTable.gradeOrder,
        classTeacherUserId: classesTable.classTeacherUserId,
        classTeacherName: usersTable.name,
        societyId: classesTable.societyId,
        schoolId: classesTable.schoolId,
        branchId: classesTable.branchId,
        sessionId: classesTable.sessionId,
        status: classesTable.status,
        studentCount: sql<number>`0`,
        sectionCount: sql<number>`0`,
      })
      .from(classesTable)
      .leftJoin(usersTable, eq(classesTable.classTeacherUserId, usersTable.id))
      .where(eq(classesTable.id, classId))
      .limit(1);

    return res.json(mapClassResponse(withTeacher!));
  },
);

router.get(
  "/branches/:branchId/sessions/:sessionId/classes/:classId/sections",
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const sessionId = Number(req.params.sessionId);
    const classId = Number(req.params.classId);

    const sections = await db
      .select({
        id: sectionsTable.id,
        code: sectionsTable.code,
        name: sectionsTable.name,
        capacity: sectionsTable.capacity,
        coordinatorUserId: sectionsTable.coordinatorUserId,
        classId: sectionsTable.classId,
        status: sectionsTable.status,
        studentCount: sql<number>`count(distinct ${studentsTable.id})`,
      })
      .from(sectionsTable)
      .leftJoin(
        studentsTable,
        and(eq(studentsTable.sectionId, sectionsTable.id), eq(studentsTable.status, "active")),
      )
      .where(
        and(
          eq(sectionsTable.classId, classId),
          eq(sectionsTable.branchId, branchId),
        ),
      )
      .groupBy(sectionsTable.id);

    return res.json(sections);
  },
);

router.post(
  "/branches/:branchId/sessions/:sessionId/classes/:classId/sections",
  async (req, res) => {
    const branchId = Number(req.params.branchId);
    const sessionId = Number(req.params.sessionId);
    const classId = Number(req.params.classId);
    const scope = await resolveSessionScope(branchId, sessionId);
    if (!scope) return res.status(404).json({ error: "Session not found" });

    const parsed = CreateSectionBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

    const [section] = await db
      .insert(sectionsTable)
      .values({
        ...parsed.data,
        classId,
        societyId: scope.societyId,
        schoolId: scope.schoolId,
        branchId: scope.branchId,
      })
      .returning();

    return res.status(201).json({ ...section, studentCount: 0 });
  },
);

export default router;
