import { Router } from "express";
import {
  attendanceRecordsTable,
  classesTable,
  db,
  sectionsTable,
  studentsTable,
} from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { MarkAttendanceBody } from "@workspace/api-zod";
import { toPgDate } from "../lib/db-values";
import { resolveSessionScope } from "../lib/scope";

const router = Router();

router.get("/branches/:branchId/sessions/:sessionId/attendance", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const scope = await resolveSessionScope(branchId, sessionId);
  if (!scope) return res.status(404).json({ error: "Session not found" });

  const date = req.query.date as string | undefined;
  const classId = req.query.classId ? Number(req.query.classId) : undefined;
  const sectionId = req.query.sectionId ? Number(req.query.sectionId) : undefined;
  const studentId = req.query.studentId ? Number(req.query.studentId) : undefined;

  const conditions = [
    eq(attendanceRecordsTable.branchId, branchId),
    eq(attendanceRecordsTable.sessionId, sessionId),
  ];
  if (date) conditions.push(eq(attendanceRecordsTable.attendanceDate, date));
  if (classId) conditions.push(eq(attendanceRecordsTable.classId, classId));
  if (sectionId) conditions.push(eq(attendanceRecordsTable.sectionId, sectionId));
  if (studentId) conditions.push(eq(attendanceRecordsTable.studentId, studentId));

  const records = await db
    .select({
      id: attendanceRecordsTable.id,
      studentId: attendanceRecordsTable.studentId,
      studentName: sql<string>`concat(${studentsTable.firstName}, ' ', ${studentsTable.lastName})`,
      admissionNumber: studentsTable.admissionNumber,
      classId: attendanceRecordsTable.classId,
      className: classesTable.name,
      sectionId: attendanceRecordsTable.sectionId,
      sectionName: sectionsTable.name,
      attendanceDate: attendanceRecordsTable.attendanceDate,
      status: attendanceRecordsTable.status,
      note: attendanceRecordsTable.note,
      branchId: attendanceRecordsTable.branchId,
      sessionId: attendanceRecordsTable.sessionId,
    })
    .from(attendanceRecordsTable)
    .leftJoin(studentsTable, eq(attendanceRecordsTable.studentId, studentsTable.id))
    .leftJoin(classesTable, eq(attendanceRecordsTable.classId, classesTable.id))
    .leftJoin(sectionsTable, eq(attendanceRecordsTable.sectionId, sectionsTable.id))
    .where(and(...conditions));

  return res.json(records);
});

router.post("/branches/:branchId/sessions/:sessionId/attendance", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const scope = await resolveSessionScope(branchId, sessionId);
  if (!scope) return res.status(404).json({ error: "Session not found" });

  const parsed = MarkAttendanceBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const { date, classId, sectionId: rawSectionId, records } = parsed.data;
  const sectionId = rawSectionId ?? 1;
  const dateStr = toPgDate(date)!;

  await db
    .delete(attendanceRecordsTable)
    .where(
      and(
        eq(attendanceRecordsTable.branchId, branchId),
        eq(attendanceRecordsTable.sessionId, sessionId),
        eq(attendanceRecordsTable.attendanceDate, dateStr),
        eq(attendanceRecordsTable.classId, classId),
        eq(attendanceRecordsTable.sectionId, sectionId),
      ),
    );

  if (records.length > 0) {
    await db.insert(attendanceRecordsTable).values(
      records.map((r) => ({
        studentId: r.studentId,
        classId,
        sectionId,
        societyId: scope.societyId,
        schoolId: scope.schoolId,
        branchId: scope.branchId,
        sessionId: scope.sessionId,
        attendanceDate: dateStr,
        status: r.status as "present" | "absent" | "late" | "excused",
        note: r.note,
      })),
    );
  }

  return res.json({ message: "Attendance marked successfully" });
});

router.get("/branches/:branchId/sessions/:sessionId/attendance/summary", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const scope = await resolveSessionScope(branchId, sessionId);
  if (!scope) return res.status(404).json({ error: "Session not found" });

  const classId = req.query.classId ? Number(req.query.classId) : undefined;
  const today = new Date().toISOString().split("T")[0];

  const todayConditions = [
    eq(attendanceRecordsTable.branchId, branchId),
    eq(attendanceRecordsTable.sessionId, sessionId),
    eq(attendanceRecordsTable.attendanceDate, today),
  ];
  if (classId) todayConditions.push(eq(attendanceRecordsTable.classId, classId));

  const [todayStats, totalStudents] = await Promise.all([
    db
      .select({
        status: attendanceRecordsTable.status,
        count: sql<number>`count(*)`,
      })
      .from(attendanceRecordsTable)
      .where(and(...todayConditions))
      .groupBy(attendanceRecordsTable.status),
    db
      .select({ count: sql<number>`count(*)` })
      .from(studentsTable)
      .where(
        and(
          eq(studentsTable.branchId, branchId),
          eq(studentsTable.sessionId, sessionId),
          eq(studentsTable.status, "active"),
        ),
      ),
  ]);

  const present = Number(todayStats.find((s) => s.status === "present")?.count ?? 0);
  const absent = Number(todayStats.find((s) => s.status === "absent")?.count ?? 0);
  const late = Number(todayStats.find((s) => s.status === "late")?.count ?? 0);
  const total = Number(totalStudents[0].count);

  const byClass = await db
    .select({
      classId: classesTable.id,
      className: classesTable.name,
      present: sql<number>`sum(case when ${attendanceRecordsTable.status} = 'present' then 1 else 0 end)`,
      total: sql<number>`count(*)`,
    })
    .from(attendanceRecordsTable)
    .leftJoin(classesTable, eq(attendanceRecordsTable.classId, classesTable.id))
    .where(
      and(
        eq(attendanceRecordsTable.branchId, branchId),
        eq(attendanceRecordsTable.sessionId, sessionId),
        eq(attendanceRecordsTable.attendanceDate, today),
      ),
    )
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
