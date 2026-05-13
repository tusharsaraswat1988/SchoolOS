import { Router } from "express";
import { db, attendanceTable, studentsTable, classesTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { MarkAttendanceBody } from "@workspace/api-zod";

const router = Router();

router.get("/schools/:schoolId/attendance", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const date = req.query.date as string | undefined;
  const classId = req.query.classId ? Number(req.query.classId) : undefined;
  const studentId = req.query.studentId ? Number(req.query.studentId) : undefined;

  const conditions = [eq(attendanceTable.schoolId, schoolId)];
  if (date) conditions.push(eq(attendanceTable.date, date));
  if (classId) conditions.push(eq(attendanceTable.classId, classId));
  if (studentId) conditions.push(eq(attendanceTable.studentId, studentId));

  const records = await db
    .select({
      id: attendanceTable.id,
      studentId: attendanceTable.studentId,
      studentName: sql<string>`concat(${studentsTable.firstName}, ' ', ${studentsTable.lastName})`,
      admissionNumber: studentsTable.admissionNumber,
      classId: attendanceTable.classId,
      className: classesTable.name,
      date: attendanceTable.date,
      status: attendanceTable.status,
      note: attendanceTable.note,
      schoolId: attendanceTable.schoolId,
    })
    .from(attendanceTable)
    .leftJoin(studentsTable, eq(attendanceTable.studentId, studentsTable.id))
    .leftJoin(classesTable, eq(attendanceTable.classId, classesTable.id))
    .where(and(...conditions));

  return res.json(records);
});

router.post("/schools/:schoolId/attendance", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const parsed = MarkAttendanceBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const { date, classId, records } = parsed.data;

  await db
    .delete(attendanceTable)
    .where(and(eq(attendanceTable.schoolId, schoolId), eq(attendanceTable.date, date), eq(attendanceTable.classId, classId)));

  if (records.length > 0) {
    await db.insert(attendanceTable).values(
      records.map((r) => ({
        studentId: r.studentId,
        classId,
        schoolId,
        date,
        status: r.status as any,
        note: r.note,
      }))
    );
  }

  return res.json({ message: "Attendance marked successfully" });
});

router.get("/schools/:schoolId/attendance/summary", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const month = req.query.month ? Number(req.query.month) : new Date().getMonth() + 1;
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
  const classId = req.query.classId ? Number(req.query.classId) : undefined;

  const today = new Date().toISOString().split("T")[0];

  const todayConditions = [eq(attendanceTable.schoolId, schoolId), eq(attendanceTable.date, today)];
  if (classId) todayConditions.push(eq(attendanceTable.classId, classId));

  const [todayStats, totalStudents] = await Promise.all([
    db
      .select({
        status: attendanceTable.status,
        count: sql<number>`count(*)`,
      })
      .from(attendanceTable)
      .where(and(...todayConditions))
      .groupBy(attendanceTable.status),
    db
      .select({ count: sql<number>`count(*)` })
      .from(studentsTable)
      .where(and(eq(studentsTable.schoolId, schoolId), eq(studentsTable.status, "active"))),
  ]);

  const present = Number(todayStats.find((s) => s.status === "present")?.count ?? 0);
  const absent = Number(todayStats.find((s) => s.status === "absent")?.count ?? 0);
  const late = Number(todayStats.find((s) => s.status === "late")?.count ?? 0);
  const total = Number(totalStudents[0].count);

  const byClass = await db
    .select({
      classId: classesTable.id,
      className: classesTable.name,
      present: sql<number>`sum(case when ${attendanceTable.status} = 'present' then 1 else 0 end)`,
      total: sql<number>`count(*)`,
    })
    .from(attendanceTable)
    .leftJoin(classesTable, eq(attendanceTable.classId, classesTable.id))
    .where(and(eq(attendanceTable.schoolId, schoolId), eq(attendanceTable.date, today)))
    .groupBy(classesTable.id, classesTable.name);

  return res.json({
    totalStudents: total,
    avgAttendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
    presentToday: present,
    absentToday: absent,
    lateToday: late,
    byClass: byClass.map((c) => ({
      classId: c.classId,
      className: c.className ?? "Unknown",
      rate: Number(c.total) > 0 ? Math.round((Number(c.present) / Number(c.total)) * 100) : 0,
    })),
  });
});

export default router;
