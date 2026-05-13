import { Router } from "express";
import { db, classesTable, studentsTable, staffTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { CreateClassBody } from "@workspace/api-zod";

const router = Router();

router.get("/schools/:schoolId/classes", async (req, res) => {
  const schoolId = Number(req.params.schoolId);

  const classes = await db
    .select({
      id: classesTable.id,
      name: classesTable.name,
      section: classesTable.section,
      grade: classesTable.grade,
      classTeacherId: classesTable.classTeacherId,
      classTeacherName: sql<string>`concat(${staffTable.firstName}, ' ', ${staffTable.lastName})`,
      schoolId: classesTable.schoolId,
      capacity: classesTable.capacity,
      studentCount: sql<number>`count(distinct ${studentsTable.id})`,
    })
    .from(classesTable)
    .leftJoin(staffTable, eq(classesTable.classTeacherId, staffTable.id))
    .leftJoin(studentsTable, and(eq(studentsTable.classId, classesTable.id), eq(studentsTable.status, "active")))
    .where(eq(classesTable.schoolId, schoolId))
    .groupBy(classesTable.id, staffTable.firstName, staffTable.lastName);

  return res.json(classes);
});

router.post("/schools/:schoolId/classes", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const parsed = CreateClassBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const [cls] = await db.insert(classesTable).values({ ...parsed.data, schoolId }).returning();
  return res.status(201).json({ ...cls, studentCount: 0 });
});

export default router;
