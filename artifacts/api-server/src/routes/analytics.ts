import { Router } from "express";
import { db, classesTable, studentsTable, attendanceTable, feeRecordsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";

const router = Router();

router.get("/schools/:schoolId/analytics/classes", async (req, res) => {
  const schoolId = Number(req.params.schoolId);

  const rows = await db
    .select({
      id: classesTable.id,
      name: classesTable.name,
      section: classesTable.section,
      grade: classesTable.grade,
      capacity: classesTable.capacity,
      studentCount: sql<number>`count(distinct ${studentsTable.id})`,
      presentCount: sql<number>`count(distinct case when ${attendanceTable.status} = 'present' then ${attendanceTable.id} end)`,
      absentCount: sql<number>`count(distinct case when ${attendanceTable.status} = 'absent' then ${attendanceTable.id} end)`,
      lateCount: sql<number>`count(distinct case when ${attendanceTable.status} = 'late' then ${attendanceTable.id} end)`,
      excusedCount: sql<number>`count(distinct case when ${attendanceTable.status} = 'excused' then ${attendanceTable.id} end)`,
      totalMarked: sql<number>`count(distinct ${attendanceTable.id})`,
      feeExpected: sql<number>`coalesce(sum(${feeRecordsTable.amount} - coalesce(${feeRecordsTable.discount}, 0)), 0)`,
      feeCollected: sql<number>`coalesce(sum(coalesce(${feeRecordsTable.paidAmount}, 0)), 0)`,
      feePending: sql<number>`coalesce(sum(case when ${feeRecordsTable.status} in ('pending', 'partial', 'overdue') then ${feeRecordsTable.amount} - coalesce(${feeRecordsTable.discount}, 0) - coalesce(${feeRecordsTable.paidAmount}, 0) else 0 end), 0)`,
      feeOverdue: sql<number>`coalesce(sum(case when ${feeRecordsTable.status} = 'overdue' then ${feeRecordsTable.amount} - coalesce(${feeRecordsTable.discount}, 0) - coalesce(${feeRecordsTable.paidAmount}, 0) else 0 end), 0)`,
      studentsPaidFull: sql<number>`count(distinct case when ${feeRecordsTable.status} = 'paid' then ${feeRecordsTable.studentId} end)`,
      studentsWithFees: sql<number>`count(distinct ${feeRecordsTable.studentId})`,
    })
    .from(classesTable)
    .leftJoin(
      studentsTable,
      and(eq(studentsTable.classId, classesTable.id), eq(studentsTable.status, "active"))
    )
    .leftJoin(attendanceTable, eq(attendanceTable.studentId, studentsTable.id))
    .leftJoin(feeRecordsTable, eq(feeRecordsTable.studentId, studentsTable.id))
    .where(eq(classesTable.schoolId, schoolId))
    .groupBy(classesTable.id, classesTable.name, classesTable.section, classesTable.grade, classesTable.capacity)
    .orderBy(classesTable.grade, classesTable.name);

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
      name: r.name,
      section: r.section,
      grade: r.grade,
      capacity,
      studentCount: students,
      fillRate,
      attendance: {
        present: present,
        absent: Number(r.absentCount ?? 0),
        late: late,
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
