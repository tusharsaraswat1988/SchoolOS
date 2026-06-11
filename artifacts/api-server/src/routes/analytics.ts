import { Router } from "express";
import {
  attendanceRecordsTable,
  classesTable,
  db,
  feeRecordsTable,
  sectionsTable,
  studentsTable,
} from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { resolveSessionScope } from "../lib/scope";

const router = Router();

router.get("/branches/:branchId/sessions/:sessionId/analytics/classes", async (req, res) => {
  const branchId = Number(req.params.branchId);
  const sessionId = Number(req.params.sessionId);
  const scope = await resolveSessionScope(branchId, sessionId);
  if (!scope) return res.status(404).json({ error: "Session not found" });

  const rows = await db
    .select({
      id: classesTable.id,
      code: classesTable.code,
      name: classesTable.name,
      gradeOrder: classesTable.gradeOrder,
      capacity: sql<number>`coalesce(sum(${sectionsTable.capacity}), 0)`,
      studentCount: sql<number>`count(distinct ${studentsTable.id})`,
      presentCount: sql<number>`count(distinct case when ${attendanceRecordsTable.status} = 'present' then ${attendanceRecordsTable.id} end)`,
      absentCount: sql<number>`count(distinct case when ${attendanceRecordsTable.status} = 'absent' then ${attendanceRecordsTable.id} end)`,
      lateCount: sql<number>`count(distinct case when ${attendanceRecordsTable.status} = 'late' then ${attendanceRecordsTable.id} end)`,
      excusedCount: sql<number>`count(distinct case when ${attendanceRecordsTable.status} = 'excused' then ${attendanceRecordsTable.id} end)`,
      totalMarked: sql<number>`count(distinct ${attendanceRecordsTable.id})`,
      feeExpected: sql<number>`coalesce(sum(${feeRecordsTable.amount} - coalesce(${feeRecordsTable.discount}, 0)), 0)`,
      feeCollected: sql<number>`coalesce(sum(coalesce(${feeRecordsTable.paidAmount}, 0)), 0)`,
      feePending: sql<number>`coalesce(sum(case when ${feeRecordsTable.status} in ('pending', 'partial', 'overdue') then ${feeRecordsTable.amount} - coalesce(${feeRecordsTable.discount}, 0) - coalesce(${feeRecordsTable.paidAmount}, 0) else 0 end), 0)`,
      feeOverdue: sql<number>`coalesce(sum(case when ${feeRecordsTable.status} = 'overdue' then ${feeRecordsTable.amount} - coalesce(${feeRecordsTable.discount}, 0) - coalesce(${feeRecordsTable.paidAmount}, 0) else 0 end), 0)`,
      studentsPaidFull: sql<number>`count(distinct case when ${feeRecordsTable.status} = 'paid' then ${feeRecordsTable.studentId} end)`,
      studentsWithFees: sql<number>`count(distinct ${feeRecordsTable.studentId})`,
    })
    .from(classesTable)
    .leftJoin(sectionsTable, eq(sectionsTable.classId, classesTable.id))
    .leftJoin(
      studentsTable,
      and(eq(studentsTable.classId, classesTable.id), eq(studentsTable.status, "active")),
    )
    .leftJoin(attendanceRecordsTable, eq(attendanceRecordsTable.studentId, studentsTable.id))
    .leftJoin(feeRecordsTable, eq(feeRecordsTable.studentId, studentsTable.id))
    .where(and(eq(classesTable.branchId, branchId), eq(classesTable.sessionId, sessionId)))
    .groupBy(classesTable.id, classesTable.code, classesTable.name, classesTable.gradeOrder)
    .orderBy(classesTable.gradeOrder, classesTable.name);

  const result = rows.map((r) => {
    const present = Number(r.presentCount ?? 0);
    const late = Number(r.lateCount ?? 0);
    const total = Number(r.totalMarked ?? 0);
    const attRate = total > 0 ? Math.round(((present + late) / total) * 100) : null;

    const expected = Number(r.feeExpected ?? 0);
    const collected = Number(r.feeCollected ?? 0);
    const feeRate = expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : null;

    const capacity = Number(r.capacity ?? 0);
    const students = Number(r.studentCount ?? 0);
    const fillRate = capacity > 0 ? Math.round((students / capacity) * 100) : 0;

    return {
      id: r.id,
      code: r.code,
      name: r.name,
      gradeOrder: r.gradeOrder,
      capacity,
      studentCount: students,
      fillRate,
      attendance: {
        present,
        absent: Number(r.absentCount ?? 0),
        late,
        excused: Number(r.excusedCount ?? 0),
        totalMarked: total,
        rate: attRate,
      },
      fees: {
        expected,
        collected,
        pending: Number(r.feePending ?? 0),
        overdue: Number(r.feeOverdue ?? 0),
        rate: feeRate,
        studentsPaidFull: Number(r.studentsPaidFull ?? 0),
        studentsWithFees: Number(r.studentsWithFees ?? 0),
      },
    };
  });

  return res.json(result);
});

export default router;
