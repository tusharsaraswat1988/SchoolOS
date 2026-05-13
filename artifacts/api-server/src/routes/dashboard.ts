import { Router } from "express";
import { db, schoolsTable, studentsTable, staffTable, feeRecordsTable, attendanceTable, classesTable, activityTable } from "@workspace/db";
import { eq, sql, and, desc } from "drizzle-orm";

const router = Router();

router.get("/schools/:schoolId/dashboard", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const today = new Date().toISOString().split("T")[0];

  const [
    school,
    feeStats,
    attendanceStats,
    classes,
    recentPayments,
    upcomingBirthdays,
    monthlyFeeData,
  ] = await Promise.all([
    db.select().from(schoolsTable).where(eq(schoolsTable.id, schoolId)).limit(1),
    db
      .select({
        totalExpected: sql<number>`sum(${feeRecordsTable.amount} - coalesce(${feeRecordsTable.discount}, 0))`,
        totalCollected: sql<number>`sum(coalesce(${feeRecordsTable.paidAmount}, 0))`,
        totalPending: sql<number>`sum(case when ${feeRecordsTable.status} in ('pending', 'partial') then ${feeRecordsTable.amount} - coalesce(${feeRecordsTable.discount}, 0) - coalesce(${feeRecordsTable.paidAmount}, 0) else 0 end)`,
      })
      .from(feeRecordsTable)
      .where(eq(feeRecordsTable.schoolId, schoolId)),
    db
      .select({
        status: attendanceTable.status,
        count: sql<number>`count(*)`,
      })
      .from(attendanceTable)
      .where(and(eq(attendanceTable.schoolId, schoolId), eq(attendanceTable.date, today)))
      .groupBy(attendanceTable.status),
    db
      .select({
        id: classesTable.id,
        name: classesTable.name,
        section: classesTable.section,
        grade: classesTable.grade,
        classTeacherId: classesTable.classTeacherId,
        classTeacherName: sql<string>`null`,
        schoolId: classesTable.schoolId,
        capacity: classesTable.capacity,
        studentCount: sql<number>`count(distinct ${studentsTable.id})`,
      })
      .from(classesTable)
      .leftJoin(studentsTable, and(eq(studentsTable.classId, classesTable.id), eq(studentsTable.status, "active")))
      .where(eq(classesTable.schoolId, schoolId))
      .groupBy(classesTable.id)
      .limit(10),
    db
      .select({
        id: feeRecordsTable.id,
        studentId: feeRecordsTable.studentId,
        studentName: sql<string>`concat(${studentsTable.firstName}, ' ', ${studentsTable.lastName})`,
        admissionNumber: studentsTable.admissionNumber,
        className: classesTable.name,
        feeType: feeRecordsTable.feeType,
        amount: feeRecordsTable.amount,
        paidAmount: feeRecordsTable.paidAmount,
        discount: feeRecordsTable.discount,
        status: feeRecordsTable.status,
        dueDate: feeRecordsTable.dueDate,
        paidDate: feeRecordsTable.paidDate,
        receiptNumber: feeRecordsTable.receiptNumber,
        paymentMethod: feeRecordsTable.paymentMethod,
        schoolId: feeRecordsTable.schoolId,
        createdAt: feeRecordsTable.createdAt,
      })
      .from(feeRecordsTable)
      .leftJoin(studentsTable, eq(feeRecordsTable.studentId, studentsTable.id))
      .leftJoin(classesTable, eq(studentsTable.classId, classesTable.id))
      .where(and(eq(feeRecordsTable.schoolId, schoolId), eq(feeRecordsTable.status, "paid")))
      .orderBy(desc(feeRecordsTable.updatedAt))
      .limit(5),
    db
      .select({
        firstName: studentsTable.firstName,
        lastName: studentsTable.lastName,
        dateOfBirth: studentsTable.dateOfBirth,
        className: classesTable.name,
      })
      .from(studentsTable)
      .leftJoin(classesTable, eq(studentsTable.classId, classesTable.id))
      .where(and(eq(studentsTable.schoolId, schoolId), eq(studentsTable.status, "active")))
      .limit(5),
    db
      .select({
        month: sql<string>`to_char(${feeRecordsTable.paidDate}::date, 'Mon')`,
        collected: sql<number>`sum(case when ${feeRecordsTable.status} = 'paid' then coalesce(${feeRecordsTable.paidAmount}, 0) else 0 end)`,
        pending: sql<number>`sum(case when ${feeRecordsTable.status} in ('pending', 'partial', 'overdue') then ${feeRecordsTable.amount} - coalesce(${feeRecordsTable.discount}, 0) - coalesce(${feeRecordsTable.paidAmount}, 0) else 0 end)`,
      })
      .from(feeRecordsTable)
      .where(eq(feeRecordsTable.schoolId, schoolId))
      .groupBy(sql`to_char(${feeRecordsTable.paidDate}::date, 'Mon')`)
      .limit(6),
  ]);

  const totalStudents = school[0]?.studentCount ?? 0;
  const totalStaff = school[0]?.staffCount ?? 0;
  const present = Number(attendanceStats.find((s) => s.status === "present")?.count ?? 0);
  const absent = Number(attendanceStats.find((s) => s.status === "absent")?.count ?? 0);
  const late = Number(attendanceStats.find((s) => s.status === "late")?.count ?? 0);
  const totalFeeExpected = Number(feeStats[0]?.totalExpected ?? 0);
  const totalFeeCollected = Number(feeStats[0]?.totalCollected ?? 0);
  const pendingFees = Number(feeStats[0]?.totalPending ?? 0);

  return res.json({
    studentCount: totalStudents,
    staffCount: totalStaff,
    attendanceRate: totalStudents > 0 ? Math.round((present / totalStudents) * 100) : 0,
    feeCollectionRate: totalFeeExpected > 0 ? Math.round((totalFeeCollected / totalFeeExpected) * 100) : 0,
    pendingFees,
    totalFeeExpected,
    totalFeeCollected,
    recentPayments,
    todayAttendance: {
      totalStudents,
      avgAttendanceRate: totalStudents > 0 ? Math.round((present / totalStudents) * 100) : 0,
      presentToday: present,
      absentToday: absent,
      lateToday: late,
      byClass: [],
    },
    classBreakdown: classes,
    monthlyFeeChart: monthlyFeeData.map((m) => ({
      month: m.month ?? "Unknown",
      collected: Number(m.collected ?? 0),
      pending: Number(m.pending ?? 0),
    })),
    upcomingBirthdays: upcomingBirthdays.map((s) => ({
      name: `${s.firstName} ${s.lastName}`,
      date: s.dateOfBirth ?? "",
      className: s.className ?? "Unknown",
    })),
  });
});

router.get("/dashboard/super-admin", async (_req, res) => {
  const [schools, schoolStats] = await Promise.all([
    db.select().from(schoolsTable).orderBy(desc(schoolsTable.createdAt)).limit(5),
    db
      .select({
        totalSchools: sql<number>`count(*)`,
        activeSchools: sql<number>`sum(case when ${schoolsTable.status} = 'active' then 1 else 0 end)`,
        totalStudents: sql<number>`sum(${schoolsTable.studentCount})`,
      })
      .from(schoolsTable),
  ]);

  const s = schoolStats[0];

  const subscriptionBreakdown = await db
    .select({
      plan: schoolsTable.subscriptionPlan,
      count: sql<number>`count(*)`,
    })
    .from(schoolsTable)
    .groupBy(schoolsTable.subscriptionPlan);

  return res.json({
    totalSchools: Number(s.totalSchools ?? 0),
    activeSchools: Number(s.activeSchools ?? 0),
    totalStudents: Number(s.totalStudents ?? 0),
    totalRevenue: 0,
    recentSchools: schools,
    subscriptionBreakdown: subscriptionBreakdown.map((b) => ({
      plan: b.plan,
      count: Number(b.count),
    })),
    monthlyGrowth: [],
  });
});

router.get("/schools/:schoolId/dashboard/activity", async (req, res) => {
  const schoolId = Number(req.params.schoolId);
  const limit = Number(req.query.limit) || 10;

  const activities = await db
    .select()
    .from(activityTable)
    .where(eq(activityTable.schoolId, schoolId))
    .orderBy(desc(activityTable.createdAt))
    .limit(limit);

  return res.json(activities);
});

export default router;
